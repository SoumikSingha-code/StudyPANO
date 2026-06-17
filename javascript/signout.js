import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { firebaseConfig } from "./connectemgg";
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
const db = getFirestore();

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("email").textContent = user.email;

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            document.getElementById("name").textContent = data.name;
            document.getElementById("class").textContent = data.class;
            document.getElementById("roll").textContent = data.roll;
            document.getElementById("role").textContent = data.role;
        }
    } else {
        window.location.href = "login.html";
    }

});
const signout = document.getElementById("sighout");
signout.addEventListener("click", function () {
    alert("reached");
    document.getElementById("shpno").innerText = "";
    document.getElementById("shname").innerText = "";
    localStorage.removeItem("name");
    localStorage.removeItem("phone");
    const radiosel = document.querySelector(`input[name="role"]`);
    if (radiosel) {
        radiosel.checked = false;
    }
    signout(auth)
        .then(() => {
            console.log("Sign Out");
        });
});