import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { deleteDoc, doc }
    from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { query, where }
    from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyDnqF2BRNKNpfQWsDsveNOHsJaFqep1wcY",
    authDomain: "studypano-8fa02.firebaseapp.com",
    projectId: "studypano-8fa02",
    storageBucket: "studypano-8fa02.firebasestorage.app",
    messagingSenderId: "611559409149",
    appId: "1:611559409149:web:c1180ec801d07f68100594"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
document.getElementById("upbtn").addEventListener("click", uploadFile);
const form = document.getElementById("upload");
const login = document.getElementById("login");
let loader;
window.addEventListener("DOMContentLoaded", () => {
    loader = document.getElementById("load");
});

import { getAuth, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
const auth = getAuth(app);
let currentUserUID = null;
const pagename = document.body.dataset.subject;
console.log("Page subject is:", pagename);
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        console.log("Logged in as:", currentUserUID);
        login.style.display = "none";
    } else {
        currentUserUID = null;
        console.log("Not logged in");
    }
    loadPapers(pagename);
});
async function uploadFile() {
    const name = document.getElementById("name").value;
    const em = document.getElementById("email").value;
    const filename = document.getElementById("inf").value;
    if (name === "") {
        showMessage("Please enter your name!", "red");
        return;
    }
    if (em === "") {
        showMessage("Please enter your Email Id!", "red");
        return;
    }
    if (filename === "") {
        showMessage("Please enter the file name!", "red");
        return;
    }
    const file = document.getElementById("fileUpload").files[0];
    if (!file) {
        showMessage("Select a file or photo first", "red");
        return;
    }
    if (!navigator.onLine) {
        showMessage("No Internet Connection. Please try again!", "red");
        return;
    }

    else {
        showMessage("Uploading.......", "green", 20000)
    }
    loader.style.display = "flex";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("email", em);
    formData.append("uid", currentUserUID);
    formData.append("filename", filename);
    formData.append("subject", pagename);
    const response = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData

    });
    let result;
    const reset = document.getElementById("ulpp");
    try {
        result = await response.json();
        loader.style.display = "flex";

    } catch (error) {
        showMessage("Server not reachable", "red");
    } finally {
        loader.style.display = "none";
        showMessage("Uploaded successfully!", "green");
    }
    console.log(result);
    if (result && result.success) {
        showMessage("Uploaded successfully!", "green");
        form.reset();
        reset.innerHTML = "Picture or File Preview";
        loadPapers(pagename);
    } else {
        showMessage("Upload failed", "red");
    }
}

import { collection, getDocs } from
    "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

async function loadPapers(subjectName) {
    loader.style.display = "flex";
    if (!navigator.onLine) {
        showMessage("No Internet Connection. No paper(s) loaded!", "red", 9000);
        return;
    }

    else {
        try {
            showMessage("Loading your papers.......", "green");
            console.log("Trying to fetch...");
            if (!subjectName) {
                console.error("Subject is undefined!");
                return;
            }
            const q = query(
                collection(db, "Papers"),
                where("subject", "==", (subjectName || "").toLowerCase())
            );

            const querySnapshot = await getDocs(q);

            const container = document.querySelector(".all");
            container.innerHTML = "";
            console.log("Documents:", querySnapshot.size);
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                const div = document.createElement("div");
                div.classList.add("op");
                const link = document.createElement("a");
                link.href = data.link;
                link.target = "_blank";
                link.textContent = data.name;
                div.appendChild(link);
                if (true) {
                    const deleteBtn = document.createElement("button");
                    deleteBtn.textContent = "🗑️ Delete";
                    deleteBtn.classList.add("delbt")
                    deleteBtn.onclick = () => {
                        console.log("Deleting ID:", doc.id);
                        deletePaper(doc.id);
                    };

                    div.appendChild(deleteBtn);
                }
                container.appendChild(div);
            });
        }
        catch (error) {
            console.error("Error fetching papers: ", error);
            showMessage("Failed to load papers", "red");
            loader.style.display = "none";
        }
    }
    loader.style.display = "none";
}

async function deletePaper(docId) {
    const confirmed = confirm("Are you sure you want to delete this paper?");
    if (!confirmed) {
        showMessage("Delete cancelled", "blue");
        return; // stop here if user cancels
    }
    try {
        await deleteDoc(doc(db, "Papers", docId));
        showMessage("Deleted successfully!", "green", 5000);
        loadPapers(pagename);
    } catch (error) {
        console.error(error);
        showMessage("Delete failed!", "red");
    }
}