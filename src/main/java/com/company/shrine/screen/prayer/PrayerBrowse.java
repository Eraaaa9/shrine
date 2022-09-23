package com.company.shrine.screen.prayer;

import io.jmix.ui.screen.*;
import com.company.shrine.entity.Prayer;

@UiController("miko_Prayer.browse")
@UiDescriptor("prayer-browse.xml")
@LookupComponent("prayersTable")
public class PrayerBrowse extends StandardLookup<Prayer> {
}