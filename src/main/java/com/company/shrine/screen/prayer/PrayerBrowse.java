package com.company.shrine.screen.prayer;

import com.company.shrine.entity.Prayer;
import io.jmix.ui.screen.LookupComponent;
import io.jmix.ui.screen.StandardLookup;
import io.jmix.ui.screen.UiController;
import io.jmix.ui.screen.UiDescriptor;

@UiController("miko_Prayer.browse")
@UiDescriptor("prayer-browse.xml")
@LookupComponent("prayersTable")
public class PrayerBrowse extends StandardLookup<Prayer> {

}