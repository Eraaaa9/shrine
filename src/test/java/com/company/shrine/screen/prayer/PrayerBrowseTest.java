package com.company.shrine.screen.prayer;

import com.company.shrine.ShrineApplication;
import com.company.shrine.entity.Address;
import com.company.shrine.entity.Prayer;
import com.company.shrine.screen.prayer.support.TestDataCleanup;
import io.jmix.core.DataManager;
import io.jmix.ui.Screens;
import io.jmix.ui.component.Button;
import io.jmix.ui.component.GroupTable;
import io.jmix.ui.screen.Screen;
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

    private Prayer prayer;
    @Autowired
    DataManager dataManager;
    @Autowired
    TestDataCleanup testDataCleanup;

    @BeforeEach
    void setUp() {

        testDataCleanup.removeAllEntities(Prayer.class);
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

    @Test
    public void given_onePrayerExists_when_openEditPrayer_then_editorScreenIsShown(Screens screens) {

        PrayerBrowse prayerBrowse = openPrayerBrowse(screens);

        Prayer firstPrayer = firstLoadedPrayer(prayerBrowse);

        selectPrayerInTable(prayerBrowse, firstPrayer);

        button(prayerBrowse, "editBtn").click();

        PrayerEdit prayerEdit = screenOfType(screens, PrayerEdit.class);

        assertThat(prayerEdit.getEditedEntity())
                .isEqualTo(prayer);
    }

    private void selectPrayerInTable(PrayerBrowse prayerBrowse, Prayer firstPrayer) {
        GroupTable<Prayer> prayersTable = getPrayersTable(prayerBrowse);

        prayersTable.setSelected(firstPrayer);
    }

    @NotNull
    private <T> T screenOfType(Screens screens, Class<T> tClass) {
        Screen screen = screens.getOpenedScreens().getActiveScreens().stream().findFirst().orElseThrow();

        assertThat(screen)
                .isInstanceOf(tClass);

        return (T) screen;
    }

    @Nullable
    private static Button button(PrayerBrowse prayerBrowse, String buttonId) {
        return (Button) prayerBrowse.getWindow().getComponent(buttonId);
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