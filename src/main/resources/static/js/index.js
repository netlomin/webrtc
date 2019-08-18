

const TYPE_COMMAND_ROOM_ENTER = "enterRoom";
const TYPE_DIALOGUE = "dialogue";
const TYPE_COMMAND_ROOM_LIST = "roomList";
const TYPE_COMMAND_REMOTER_READY = "remoteReady";

let iceServers={
    "iceServers":[
        {"url":"stun:stun.services.mozilla.com"},
        {"url":"stun:stun.l.google.com:19302"}
    ]
};
const mediaConstraints = {
    video: {width: 500, height: 500},
    audio: true
};

const streamConstraints = {
    video: true,
    audio: true
};

let localStream;
let remoteStream;

let rtcPeerConnection;


//写在这里不行，得写到promise的then里面才起作用
//const localVideo = document.getElementById("localVideo");
//const remoteVideo = document.getElementById("remoteVideo");

let websocket;
let userId;
let roomId;
let caller = false;

let log;

window.onload = ()=>{
    log = (message) => {
        let log = document.getElementById("log");
        let oneLog = document.createElement("span");
        oneLog.innerText = message;
        let br  = document.createElement("br");
        log.append(oneLog,br);
    };
    document.getElementById("sureUserId").onclick = () =>{
        userId = document.getElementById("userId").value;
        document.getElementById("showUserId").innerText = userId;
        document.getElementById("firstInput").style.display="none";
        document.getElementById("main").style.display="block";
    };

    get("/getWebSocketUrl")
        .then((data) => {
            if (!websocket) {
                websocket = new WebSocket(data.url);
                log("websocket连接成功")
            }
            websocket.onopen = () => {
                websocket.send(JSON.stringify({command:"roomList"}))
            };
            websocket.onclose = () => {
                log("Connection closed.");
            };
            websocket.onerror = () => {
                log("websocket error");
            };
            websocket.onmessage = handleMessage;

        })
        .catch((error) => {
            log(error);
        });

    document.getElementById("enterRoom").onclick = () =>{
        userId = document.getElementById("userId").value;
        roomId = document.getElementById("roomId").value;
        enterRoom(roomId);
        websocket.send(JSON.stringify({command: "roomList"}));
    };

    document.getElementById("sendMessage").onclick = () =>{
        let textMessage = document.getElementById("textMessage").value;
        websocket.send(JSON.stringify({command:"dialogue",userId:userId,roomId : roomId, message: textMessage}));

    };



};

const handleMessage = (event) => {
    log(event.data);
    let message = JSON.parse(event.data);
    switch (message.command) {
        case TYPE_COMMAND_ROOM_ENTER:
            if (message.message === "joined"){
                log("加入房间：" + message.roomId + "成功");
                roomId = message.roomId;
                openLocalMedia()
                    .then(()=>{
                        websocket.send(JSON.stringify({command:"remoteReady",userId:userId,roomId : roomId}));
                    })
                    .catch(()=>{
                        log("打开本地音视频设备失败");
                    })
            }else {
                log("创建房间：" + message.roomId + "成功");
                caller = true;
                openLocalMedia();
            }

            break;
        case TYPE_COMMAND_ROOM_LIST:
            let roomList = document.getElementById("roomList");
            //这个方法会少删子节点，不知为何，用另一个方法
            /*roomList.childNodes.forEach((node) =>{
                roomList.removeChild(node);
            });*/
            //当div下还存在子节点时 循环继续
            while(roomList.hasChildNodes()) {
                roomList.removeChild(roomList.firstChild);
            }
            JSON.parse(message.message).forEach((roomId) =>{
                let item = document.createElement("div");
                let label = document.createElement("label");
                label.setAttribute("for", roomId);
                label.innerText = "房间号：";
                let span = document.createElement("span");
                span.innerText = roomId;
                let button = document.createElement("button");
                button.innerText = "加入房间";
                button.onclick = () => {
                    enterRoom(roomId);
                };
                item.append(label,span,button);
                roomList.append(item);
            });
            break;
        case TYPE_DIALOGUE:
            let dialogue = document.createElement("p").innerText = message.userId+":"+message.message;
            let br = document.createElement("br");
            document.getElementById("dialogueList").append(dialogue,br);
            break;
        case TYPE_COMMAND_REMOTER_READY:
            if (caller) {
                //初始化一个webrtc端点
                rtcPeerConnection = new RTCPeerConnection();
                //添加事件监听函数
                rtcPeerConnection.onicecandidate;
                rtcPeerConnection.ontrack;

                rtcPeerConnection.addTrack(localStream);
                rtcPeerConnection.createOffer()
                    .then()
                    .catch((e)=>{
                        log("createOffer,error:" + e);
                    })

            }

    }

};
//创建或者加入一个房间
const enterRoom = (roomId) =>{
    websocket.send(JSON.stringify({command:"enterRoom",userId:userId,roomId : roomId}));
};
//打开本地音视频,用promise这样在打开视频成功后，再进行下一步操作
/*const openLocalMedia = () => {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((mediaStream) => {
            // make stream available to browser console(设置不设置都没问题)
            window.stream = mediaStream;
            //localVideo.srcObject = mediaStream;
            localStream = stream;
            let localVideo = document.getElementById("localVideo");
            localVideo.srcObject = stream;
            localVideo.play();

        })
        .catch((error) => {
            log(error);
        });
};*/

//打开本地音视频
const openLocalMedia = () => {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then((mediaStream) => {
                // make stream available to browser console(设置不设置都没问题)
                window.stream = mediaStream;
                //localVideo.srcObject = mediaStream;
                localStream = stream;
                let localVideo = document.getElementById("localVideo");
                localVideo.srcObject = stream;
                localVideo.play();

            })
            .then(() => resolve())
            .catch(() => reject());
    });

};

