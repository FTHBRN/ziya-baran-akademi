import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let win = UIWindow(windowScene: windowScene)
        win.backgroundColor = .white

        let bridgeVC = CAPBridgeViewController()
        win.rootViewController = bridgeVC
        win.makeKeyAndVisible()
        self.window = win

        // Native Splash Overlay: Preserves the LaunchScreen logo seamlessly over the webview
        let splashOverlay = UIView(frame: win.bounds)
        splashOverlay.backgroundColor = .white
        splashOverlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        let imageView = UIImageView(frame: splashOverlay.bounds)
        imageView.image = UIImage(named: "Splash")
        imageView.contentMode = .scaleAspectFill
        imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        imageView.clipsToBounds = true
        splashOverlay.addSubview(imageView)

        win.addSubview(splashOverlay)
        win.bringSubviewToFront(splashOverlay)

        // Smooth fade-out after the webview initializes (1.3 seconds)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) {
            UIView.animate(withDuration: 0.4, delay: 0, options: [.curveEaseInOut], animations: {
                splashOverlay.alpha = 0
            }, completion: { _ in
                splashOverlay.removeFromSuperview()
            })
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
