let totalSeconds = Number(localStorage.getItem("studySeconds")) || 0;
let studying = true;

setInterval(() => {

    if (studying) {

        totalSeconds++;

        localStorage.setItem("studySeconds", totalSeconds);

    }

}, 1000);