package com.company.shrine.screen.prayer;

import io.jmix.ui.screen.*;
import com.company.shrine.entity.Prayer;

@UiController("miko_Prayer.edit")
@UiDescriptor("prayer-edit.xml")
@EditedEntityContainer("prayerDc")
public class PrayerEdit extends StandardEditor<Prayer> {
}