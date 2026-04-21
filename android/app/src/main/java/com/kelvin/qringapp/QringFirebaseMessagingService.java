package com.kelvin.qringapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class QringFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "qring_alerts";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Map<String, String> data = remoteMessage.getData();
        String title = valueOr(data.get("title"), remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : null, "Qring Alert");
        String body = valueOr(data.get("body"), remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : null, "You have a new notification.");
        String route = valueOr(data.get("route"), "/dashboard/notifications");
        String panicId = valueOr(data.get("panicId"), "");
        String actionSet = valueOr(data.get("actionSet"), "");

        createNotificationChannel();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(buildDeepLinkIntent("open", panicId, route, 10));

        if ("panic_response".equals(actionSet) && !panicId.isEmpty()) {
            builder.addAction(0, "I'm Responding", buildDeepLinkIntent("respond", panicId, route, 11));
            builder.addAction(0, "Ignore", buildDeepLinkIntent("ignore", panicId, route, 12));
            builder.addAction(0, "Report False", buildDeepLinkIntent("report_false", panicId, route, 13));
        }

        int notificationId = Math.abs((panicId.isEmpty() ? title + body : panicId).hashCode());
        NotificationManagerCompat.from(this).notify(notificationId, builder.build());
    }

    private PendingIntent buildDeepLinkIntent(String action, String panicId, String route, int requestCode) {
        Uri uri = Uri.parse("qring://notification-action")
            .buildUpon()
            .appendQueryParameter("action", action)
            .appendQueryParameter("panicId", panicId)
            .appendQueryParameter("route", route)
            .build();

        Intent intent = new Intent(Intent.ACTION_VIEW, uri, this, MainActivity.class);
        intent.setPackage(getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(this, requestCode + Math.abs(panicId.hashCode()), intent, flags);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Qring Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Realtime panic, visitor, and security alerts");
        manager.createNotificationChannel(channel);
    }

    private String valueOr(String first, String second, String fallback) {
        if (first != null && !first.trim().isEmpty()) return first;
        if (second != null && !second.trim().isEmpty()) return second;
        return fallback;
    }

    private String valueOr(String first, String fallback) {
        if (first != null && !first.trim().isEmpty()) return first;
        return fallback;
    }
}
