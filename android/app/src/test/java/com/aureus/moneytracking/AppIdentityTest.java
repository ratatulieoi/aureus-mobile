package com.aureus.moneytracking;

import static org.junit.Assert.assertEquals;

import java.nio.file.Path;
import org.junit.Test;

public class AppIdentityTest {

    @Test
    public void sourcePackageMatchesApplicationId() {
        assertEquals("com.aureus.moneytracking", MainActivity.class.getPackage().getName());
    }

    @Test
    public void namespaceMapsToExpectedSourceDirectory() {
        assertEquals(
            Path.of("com", "aureus", "moneytracking"),
            Path.of(MainActivity.class.getPackage().getName().replace('.', '/'))
        );
    }
}
