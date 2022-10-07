package com.company.shrine.screen.prayer;

import com.company.shrine.ShrineApplication;
import com.company.shrine.entity.Address;
import com.company.shrine.entity.Prayer;
import io.jmix.core.DataManager;
import io.jmix.ui.Screens;
import io.jmix.ui.component.GroupTable;
import io.jmix.ui.testassist.UiTestAssistConfiguration;
import io.jmix.ui.testassist.junit.UiTest;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@UiTest(authenticatedUser = "admin", mainScreenId = "miko_MainScreen", screenBasePackages = "com.company.shrine")
@ContextConfiguration(classes = {ShrineApplication.class, UiTestAssistConfiguration.class})
@AutoConfigureTestDatabase
class PrayerBrowseTest {

    @Autowired
    DataManager dataManager;
    private Prayer prayer;

    @BeforeEach
    void setUp() {
        prayer = dataManager.create(Prayer.class);

        prayer.setFirstName("Yerlen");
        prayer.setLastName("Toktarov");
        prayer.setEmail("dasd@dsd.com");
        Address address = dataManager.create(Address.class);
        address.setPostCode("01000");
        address.setCity("Astana");
        address.setStreet("Otyrar");
        prayer.setAddress(address);
        dataManager.save(prayer);
    }

    @Test
    public void given_onePrayerExists_when_openPrayerBrowse_then_tableContainerThePrayer(Screens screens) {

        PrayerBrowse prayerBrowse = openPrayerBrowse(screens);

        assertThat(firstLoadedPrayer(prayerBrowse))
                .isEqualTo(prayer);
    }

    @NotNull
    private Prayer firstLoadedPrayer(PrayerBrowse prayerBrowse) {
        Collection<Prayer> prayers = loadedPrayers(prayerBrowse);

        return prayers.stream().findFirst().orElseThrow();
    }

    @NotNull
    private Collection<Prayer> loadedPrayers(PrayerBrowse prayerBrowse) {
        GroupTable<Prayer> prayersTable = getPrayersTable(prayerBrowse);

        return prayersTable.getItems().getItems();
    }

    @Nullable
    private GroupTable<Prayer> getPrayersTable(PrayerBrowse prayerBrowse) {
        return (GroupTable<Prayer>) prayerBrowse.getWindow().getComponent("prayersTable");
    }

    @NotNull
    private PrayerBrowse openPrayerBrowse(Screens screens) {
        PrayerBrowse prayerBrowse = screens.create(PrayerBrowse.class);

        prayerBrowse.show();
        return prayerBrowse;
    }

    @AfterEach
    void tearDown() {
        dataManager.remove(prayer);
    }
}