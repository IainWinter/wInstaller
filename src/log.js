let log = document.getElementById('log');
        
window.api.receive('log', (msg) => 
{
    let p = document.createElement("p");
    p.appendChild(document.createTextNode(msg));
    p.classList = "log-item";

    log.appendChild(p);
    console.log(msg);

    log.scrollTop = log.scrollHeight;
});