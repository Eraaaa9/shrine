package com.company.shrine.entity;

import io.jmix.core.DataManager;
import io.jmix.core.security.SystemAuthenticator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.validation.ConstraintViolation;
import javax.validation.Validator;
import javax.validation.groups.Default;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PrayerIntegrationTest {

    @Autowired
    DataManager dataManager;
    @Autowired
    SystemAuthenticator systemAuthenticator;
    @Autowired
    Validator validator;
    private Prayer prayer;

    @BeforeEach
    void setUp() {
        prayer = dataManager.create(Prayer.class);
    }

    @Test
    void given_validPrayer_when_savePrayer_then_prayerIsSaved() {

        prayer.setFirstName("Yae");
        prayer.setLastName("Miko");
        prayer.setEmail("yae@miko.com");

        Prayer savedPrayer = systemAuthenticator.withSystem(() -> dataManager.save(prayer));
        assertThat(savedPrayer.getId()).isNotNull();
    }

    @Test
    void given_PrayerWithInvalidEmail_when_savePrayer_then_prayerIsSaved() {
        prayer.setFirstName("Yae");
        prayer.setLastName("Miko");
        prayer.setEmail("invalidmikocom");
        Set<ConstraintViolation<Prayer>> violations = validator.validate(prayer, Default.class);

        assertThat(violations)
                .hasSize(1);

        assertThat(firstViolation(violations).getPropertyPath().toString())
                .isEqualTo("email");
    }

    private ConstraintViolation<Prayer> firstViolation(Set<ConstraintViolation<Prayer>> violations) {
        return violations.stream().findFirst().orElseThrow();
    }
}