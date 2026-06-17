import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDnqF2BRNKNpfQWsDsveNOHsJaFqep1wcY",
    authDomain: "studypano-8fa02.firebaseapp.com",
    projectId: "studypano-8fa02",
    storageBucket: "studypano-8fa02.firebasestorage.app",
    messagingSenderId: "611559409149",
    appId: "1:611559409149:web:c1180ec801d07f68100594"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const msg = document.getElementById("msg");

function showMessage(text, bgColor, duration = 2000) {
    msg.style.display = "flex";
    msg.innerText = text;
    msg.style.background = bgColor;

    setTimeout(() => {
        msg.style.display = "none";
    }, duration);
}

window.forgotPassword = function () {

    const email = document.getElementById("email").value;
    if (email === "") {
        showMessage("Please enter your email!", "red");
        return;
    }

    sendPasswordResetEmail(auth, email)

        .then(() => {
            console.log("Email request sent!");
            showMessage("Password reset email sent.", "green");
        })

        .catch((error) => {
            console.log(error.code);
            showMessage(error.message, "red");
        });
};