import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
export const firebaseConfig = {
    apiKey: "AIzaSyDnqF2BRNKNpfQWsDsveNOHsJaFqep1wcY",
    authDomain: "studypano-8fa02.firebaseapp.com",
    projectId: "studypano-8fa02",
    storageBucket: "studypano-8fa02.firebasestorage.app",
    messagingSenderId: "611559409149",
    appId: "1:611559409149:web:c1180ec801d07f68100594"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
window.googleLogin = async function () {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("User signed in:", user.email);
    } catch (error) {
        console.log(error.code);
        console.log(error.message);
    }
};
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user);
        console.log(user.providerData[0].email);
        console.log(user.providerData);
    } else {
        console.log("User not logged in");
    }
});