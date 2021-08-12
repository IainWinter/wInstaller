let back_button = document.getElementById("back-button");
let props_back = {};

function lock_back() {
    props_back["back_button_color"] = back_button.style.color;
    props_back["back_button_href"]  = back_button.href;
    back_button.style.color = "grey";
    back_button.href = "#";
}

function unlock_back() {
    back_button.style.color = props_back["back_button_color"];
    back_button.href        = props_back["back_button_href"];
}