import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    private let panicCategoryId = "panic_response"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        registerNotificationCategories()
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let payload = response.notification.request.content.userInfo
        let panicId = String(describing: payload["panicId"] ?? payload["panic_id"] ?? "")
        let route = String(describing: payload["route"] ?? "/dashboard/notifications")
        let actionId = response.actionIdentifier

        if actionId != UNNotificationDefaultActionIdentifier, !panicId.isEmpty {
            let encodedRoute = route.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "/dashboard/notifications"
            let encodedPanicId = panicId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? panicId
            if let url = URL(string: "qring://notification-action?action=\(actionId)&panicId=\(encodedPanicId)&route=\(encodedRoute)") {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }

        completionHandler()
    }

    private func registerNotificationCategories() {
        let respond = UNNotificationAction(identifier: "respond", title: "I'm Responding", options: [.foreground])
        let ignore = UNNotificationAction(identifier: "ignore", title: "Ignore", options: [.foreground])
        let reportFalse = UNNotificationAction(identifier: "report_false", title: "Report False", options: [.foreground, .destructive])
        let panicCategory = UNNotificationCategory(
            identifier: panicCategoryId,
            actions: [respond, ignore, reportFalse],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([panicCategory])
    }
}
