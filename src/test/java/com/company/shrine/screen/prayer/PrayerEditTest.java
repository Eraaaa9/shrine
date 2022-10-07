package com.company.shrine.screen.prayer;

import com.company.shrine.ShrineApplication;
import com.company.shrine.entity.Prayer;
import com.company.shrine.screen.prayer.support.TestDataCleanup;
import io.jmix.core.DataManager;
import io.jmix.core.querycondition.PropertyCondition;
import io.jmix.ui.Screens;
import io.jmix.ui.testassist.UiTestAssistConfiguration;
import io.jmix.ui.testassist.junit.UiTest;
import io.jmix.ui.util.OperationResult;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@SpringBootTest
@UiTest(authenticatedUser = "admin", mainScreenId = "miko_MainScreen", screenBasePackages = "com.company.shrine")
@ContextConfiguration(classes = {ShrineApplication.class, UiTestAssistConfiguration.class})
@AutoConfigureTestDatabase
class PrayerEditTest {

    @Autowired
    DataManager dataManager;
    @Autowired
    TestDataCleanup testDataCleanup;
    FormInteractions formInteractions;

    @BeforeEach
    void setUp() {
        testDataCleanup.removeAllEntities(Prayer.class);
    }

    @Test
    public void given_validPrayer_when_savedPrayerThroughForm_then_prayerIsStored(Screens screens) {

        PrayerEdit prayerEdit = openPrayerEdit(screens);
        formInteractions = FormInteractions.of(prayerEdit);

        String firstName = "Yerlen" + UUID.randomUUID();
        formInteractions.setFieldValue("firstNameField", firstName);
        String lastName = "Toktarov";
        formInteractions.setFieldValue("lastNameField", lastName);
        formInteractions.setFieldValue("addressStreetField", "Otyrar");

        OperationResult operationResult = formInteractions.saveForm();

        assertThat(operationResult)
                .isEqualTo(OperationResult.success());

        Optional<Prayer> savedPrayer = findCustomerByAttribute("firstName", firstName);

        assertThat(savedPrayer)
                .isPresent()
                .get()
                .extracting("lastName")
                .isEqualTo(lastName);

    }

    @Test
    public void given_invalidPrayer_when_savedPrayerThroughForm_then_prayerIsNotStored(Screens screens) {

        PrayerEdit prayerEdit = openPrayerEdit(screens);
        formInteractions = FormInteractions.of(prayerEdit);

        String firstName = "Yerlen" + UUID.randomUUID();
        formInteractions.setFieldValue("firstNameField", firstName);
        String invalidLastName = "";
        formInteractions.setFieldValue("lastNameField", invalidLastName);
        formInteractions.setFieldValue("addressStreetField", "Otyrar");

        OperationResult operationResult = formInteractions.saveForm();

        assertThat(operationResult)
                .isEqualTo(OperationResult.fail());

        Optional<Prayer> savedPrayer = findCustomerByAttribute("firstName", firstName);

        assertThat(savedPrayer)
                .isNotPresent();

    }

    @NotNull
    private Optional<Prayer> findCustomerByAttribute(String attribute, String value) {
        return dataManager.load(Prayer.class)
                .condition(PropertyCondition.equal(attribute, value))
                .optional();
    }

    @NotNull
    private PrayerEdit openPrayerEdit(Screens screens) {
        PrayerEdit screen = screens.create(PrayerEdit.class);

        Prayer prayer = dataManager.create(Prayer.class);
        screen.setEntityToEdit(prayer);
        screen.show();
        return screen;
    }
}