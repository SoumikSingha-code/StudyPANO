import { initializeApp }
    from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
    getMessaging,
    getToken
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging.js";
const firebaseConfig = {
    apiKey: "AIzaSyDnqF2BRNKNpfQWsDsveNOHsJaFqep1wcY",
    authDomain: "studypano-8fa02.firebaseapp.com",
    projectId: "studypano-8fa02",
    storageBucket: "studypano-8fa02.firebasestorage.app",
    messagingSenderId: "611559409149",
    appId: "1:611559409149:web:c1180ec801d07f68100594"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const iner = document.getElementById("move1");
const noti = document.getElementById("Notify");
const not = document.getElementById("notification");
iner.style.left = "0px";
noti.style.background = "none";
iner.style.background = "white";
window.setupFCM = async function () {
    let perm;
    Notification.requestPermission()
        .then(perm => {
            if (perm === "granted") {
                iner.style.left = "50px";
                noti.style.background = "#e0e0e0";
                iner.style.background = "#121212";
                localStorage.setItem("permition", "true");

            }
            else {
                console.log("Permition not granted!");
                iner.style.left = "0px";
                noti.style.background = "none";
                iner.style.background = "white";
                localStorage.setItem("permition", "false");
            }
        });
    if (perm === "granted") {
        const token = await getToken(messaging, {
            vapidKey: "BKE1d8SO44SwmFc12nBOB4SIkCZ9FM3qd0YnQuPbye79zOZTFTS4dbjzKu_MF8uJ0V0v0c7-zQf6GWzdhW3hPuc"
        });
        console.log("TOKEN : ", token);
    }
    not.style.display = "none";
}
window.permno = () => {
    not.style.display = "none";
}
window.onload = () => {
    const ask = localStorage.getItem("permition");
    if (ask === "true" || Notification.permission === "granted") {
        iner.style.left = "50px";
        noti.style.background = "#e0e0e0";
        iner.style.background = "#121212";
    }
    else {
        iner.style.left = "0px";
        noti.style.background = "none";
        iner.style.background = "white";
    }
}