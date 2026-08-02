package com.aureus.moneytracking;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.content.Intent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppLaunchInstrumentedTest {

    @Test
    public void applicationIdIsStable() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.aureus.moneytracking", appContext.getPackageName());
    }

    @Test
    public void launcherActivityStarts() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent launchIntent = appContext.getPackageManager().getLaunchIntentForPackage(appContext.getPackageName());
        assertNotNull("Launcher intent must be registered", launchIntent);

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(launchIntent)) {
            scenario.onActivity(activity -> assertEquals(MainActivity.class, activity.getClass()));
        }
    }
}
