import { Platform } from 'react-native';
import { getDatabase } from '../db/database';
import { getActiveRecurringTransactions } from '../db/queries';

// expo-notifications nu funcționează în Expo Go SDK 54+
// Va fi activat complet în build-ul de producție (.apk)
const isExpoGo = typeof __DEV__ !== 'undefined' && __DEV__;

export function saveNotificationPreference(enabled: boolean): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES ('notifications_enabled', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [enabled ? 'true' : 'false']
  );
}

export function getNotificationPreference(): boolean {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'notifications_enabled';"
  );
  return row?.value === 'true';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (isExpoGo) return true;
  try {
    const Notifications = await import('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return true;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export async function scheduleDailyReminder(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Cashly',
        body: 'Ai trecut cheltuielile de azi? 30 secunde și ești la zi.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  } catch {}
}

export async function scheduleRecurringAlerts(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    const recurring = getActiveRecurringTransactions();
    const today = new Date().getDate();
    for (const rec of recurring) {
      if (!rec.day_of_month) continue;
      const daysUntil = rec.day_of_month - today;
      if (daysUntil === 2) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Plată recurentă',
            body: `${rec.name} de ${rec.amount.toLocaleString('ro-RO')} RON se debitează poimâine.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 5,
          },
        });
      }
    }
  } catch {}
}

export async function initNotifications(): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Cashly',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const enabled = getNotificationPreference();
    if (enabled) {
      await scheduleDailyReminder();
      await scheduleRecurringAlerts();
    }
  } catch {}
}