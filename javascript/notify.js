import { getApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const app = getApp();
const messaging = getMessaging(app);
const auth = getAuth(app);

const BACKEND_URL = "http://localhost:3000";

window.setupFCM = async function () {
    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            showMessage("Notification permission denied!", "red");
            document.getElementById("notification").style.display = "none";
            return;
        }

        // ✅ Register service worker
        const swRegistration = await navigator.serviceWorker.register(
            "/HTML/StudyPANO/firebase-messaging-sw.js"
        );

        // ✅ Wait for service worker to be fully active
        await navigator.serviceWorker.ready;

        console.log("Service Worker ready ✅");

        const token = await getToken(messaging, {
            vapidKey: "BKE1d8SO44SwmFc12nBOB4SIkCZ9FM3qd0YnQuPbye79zOZTFTS4dbjzKu_MF8uJ0V0v0c7-zQf6GWzdhW3hPuc",
            serviceWorkerRegistration: swRegistration
        });

        if (!token) {
            showMessage("Failed to get token!", "red");
            return;
        }

        console.log("Token:", token);

        const user = auth.currentUser;
        const userId = user ? user.uid : null;

        await fetch(`${BACKEND_URL}/save-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, userId })
        });

        showMessage("Notifications enabled! ✅", "green");
        document.getElementById("notification").style.display = "none";
        document.getElementById("move1").style.left = "48px";
        localStorage.setItem("notif", "on");

    } catch (err) {
        console.error("FCM Error:", err);
        showMessage("Error enabling notifications!", "red");
    }
};

window.permno = function () {
    document.getElementById("notification").style.display = "none";
    localStorage.setItem("notif", "off");
};

if (localStorage.getItem("notif") === "on") {
    document.getElementById("move1").style.left = "48px";
}