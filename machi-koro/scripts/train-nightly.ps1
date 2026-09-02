# Nightly bot training, run by the "Machi Koro nightly bot training" scheduled
# task at 00:00 so the search gets the machine while nobody wants it.
#
# Each night is one more session of the same search: it starts from the
# strategy currently shipped in src/shared/bot-weights.ts, so a night that
# ships compounds into the next one, and a night that finds nothing costs
# nothing but electricity.  Both table sizes are trained, variable supply
# only -- fixed supply is the mode that gets played least and its strategy is
# in good shape.
#
#   .\scripts\train-nightly.ps1 -DryRun     print the commands, run nothing

[CmdletBinding()]
param(
    # Print what would run instead of running it.
    [switch]$DryRun,
    # A leg is skipped rather than started once the clock passes this hour, so
    # an overrunning night can never eat into working hours.
    [int]$StopStartingAfterHour = 7
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

# Task Scheduler hands the script a bare environment, so node may not be on the
# PATH the way it is in a terminal.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path = "C:\Program Files\nodejs;$env:Path"
}

$logDir = Join-Path $repo 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("train-" + (Get-Date -Format 'yyyy-MM-dd') + ".log")
$summary = Join-Path $logDir 'summary.log'

function Write-Log([string]$line) {
    $stamped = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $line
    Write-Output $stamped
    Add-Content -Path $log -Value $stamped -Encoding utf8
}

# Never stack a run on top of one that is somehow still going.
$running = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'train\.ts' }
if ($running) {
    Write-Log "a training run is already in progress ($($running.Count) processes) - nothing to do"
    exit 0
}

$deadline = (Get-Date).Date.AddHours($StopStartingAfterHour)
if ((Get-Date) -ge $deadline) {
    Write-Log "started past $($StopStartingAfterHour):00 - skipping tonight rather than taking the machine during the day"
    exit 0
}

# A fresh seed every night, so each run searches somewhere new instead of
# replaying the same generations.
$seed = [int](Get-Date -Format 'yyyyMMdd')

# Whichever leg goes second is the one that gets cut if the night runs long, so
# alternate the order and neither table size is always the loser.
if ((Get-Date).DayOfYear % 2 -eq 0) { $legs = @(4, 5) } else { $legs = @(5, 4) }

Write-Log "nightly training: variable supply, $($legs -join 'p then ')p, seed $seed"

foreach ($p in $legs) {
    if ((Get-Date) -ge $deadline) {
        Write-Log "skipping the $($p)-player leg: past $($StopStartingAfterHour):00"
        break
    }

    # The search continues the shipped strategy (--init tuned) in a neighbourhood
    # of it (--sigma 0.2), and only ships a candidate that beats it both ways
    # round over --final games a side.  The per-candidate game counts are well
    # above the daytime defaults: a 264-game score at a 4-player table is mostly
    # noise, which is what held every candidate in the last runs.
    $train = "npx tsx src/shared/train.ts --mode variable --players $p --init tuned " +
             "--gens 24 --pop 24 --games 400 --promo 1200 --final 4000 " +
             "--sigma 0.2 --promo-margin 0.01 --seed $($seed + $p)"

    Write-Log "starting the $($p)-player leg: $train"
    if ($DryRun) { continue }

    # Routed through cmd so stdout and stderr land in one file in order;
    # PowerShell 5.1 wraps a native command's stderr in error records instead.
    & cmd.exe /c "$train >> ""$log"" 2>&1"
    $code = $LASTEXITCODE

    $result = Get-Content $log | Where-Object { $_ -match 'bot-weights\.ts:' } | Select-Object -Last 1
    if ($code -ne 0) { $result = "FAILED with exit code $code" }
    elseif (-not $result) { $result = 'finished without a summary line' }
    Write-Log "$($p)-player leg: $result"
    Add-Content -Path $summary -Encoding utf8 -Value (
        "{0}  {1}p  {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $p, $result)
}

if (-not $DryRun) {
    # Keep a month of nights; the strategies themselves live in git.
    Get-ChildItem $logDir -Filter 'train-*.log' |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
}

Write-Log 'done'
