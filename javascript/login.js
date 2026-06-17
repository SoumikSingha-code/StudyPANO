window.onload = function () {
    shw();
};
function showMessage(text, bgColor, duration = 2000) {
    msg.style.display = "flex";
    msg.innerText = text;
    msg.style.background = bgColor;
    setTimeout(() => {
        msg.style.display = "none";
    }, duration);
}
const password = document.getElementById("pass");
const message = document.getElementById("message");
const bt = document.getElementById("signin");
password.addEventListener("input", function () {
    let pas = password.value;
    let dig = pas.match(/\d/g);
    if (dig.length >= 6) {
        bt.disable = false;
    }
    else {
        showMessage("Password must contain at least 6 characters!", "red", 2000);
    }
});
function toggle1() {
    const password = document.getElementById("pass");
    const eye = document.getElementById("toggle1");
    if (password.type === "password") {
        password.type = "text";
        eye.textContent = "🙉";
    }
    else {
        password.type = "password";
        eye.textContent = "🙈";
    }
}
function toggle2() {
    const passwordc = document.getElementById("passcheck");
    const eye = document.getElementById("toggle2");
    if (passwordc.type === "password") {
        passwordc.type = "text";
        eye.textContent = "🙉";
    }
    else {
        passwordc.type = "password";
        eye.textContent = "🙈";
    }
}
function shw() {
    console.log("Page loaded");
    document.getElementById("lc1").classList.toggle("show");
}
function check1() {
    const password = document.getElementById("pass");
    const pass = document.getElementById("passcheck");

    if (!(password.value.length >= 6)) {
        showMessage("Password is not of 6 or more characters!");
        return;
    }
    if (pass.value === password.value) {
        showMessage("Verified!", "green", 7000);
        ld();
    }
    else {
        showMessage("Both password are not same.", "red", 10000);
    }
}
function check2() {
    const name = document.getElementById("name").value;
    const em = document.getElementById("email").value;
    const password = document.getElementById("pass").value;
    const vr = document.getElementById("passcheck").value;
    if (name === "") {
        showMessage("Enter your name!", "red");
        return;
    }
    else if (em === "") {
        showMessage("Enter your Email Id!", "red");
        return;
    }
    else if (password === "") {
        showMessage("Enter your password!", "red");
        return;
    }
    else if (vr === "") {
        showMessage("Enter your password for verifing!", "red");
        return;
    }
}
function ld() {
    document.getElementById("load").classList.toggle("show");
}