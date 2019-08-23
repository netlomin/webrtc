

const TYPE_COMMAND_ROOM_ENTER = "enterRoom";
const TYPE_COMMAND_ROOM_LIST = "roomList";
const TYPE_COMMAND_DIALOGUE = "dialogue";
const TYPE_COMMAND_READY = "ready";
const TYPE_COMMAND_OFFER = "offer";
const TYPE_COMMAND_ANSWER = "answer";
const TYPE_COMMAND_CANDIDATE = "candidate";




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

let localMediaStream;
let remoteMediaStream;

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
                websocket.send(JSON.stringify({command:TYPE_COMMAND_ROOM_LIST}))
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
        websocket.send(JSON.stringify({command:TYPE_COMMAND_ROOM_ENTER,userId:userId,roomId : roomId}));
        websocket.send(JSON.stringify({command: TYPE_COMMAND_ROOM_LIST}));
    };

    document.getElementById("sendMessage").onclick = () =>{
        let textMessage = document.getElementById("textMessage").value;
        websocket.send(JSON.stringify({command:TYPE_COMMAND_DIALOGUE,userId:userId,roomId : roomId, message: textMessage}));
    };



};

const handleMessage = (event) => {
    console.log(event);
    log(event.data);
    let message = JSON.parse(event.data);
    switch (message.command) {
        case TYPE_COMMAND_ROOM_ENTER:
            if (message.message === "joined") {
                log("加入房间：" + message.roomId + "成功");
                roomId = message.roomId;
                openLocalMedia()
                    .then(() => {
                        log("打开本地音视频设备成功");
                        websocket.send(JSON.stringify({command: TYPE_COMMAND_READY, userId: userId, roomId: roomId}));
                    })
                    .catch(() => {
                        log("打开本地音视频设备失败");
                    })
            } else {
                log("创建房间：" + message.roomId + "成功");
                caller = true;
                openLocalMedia()
                    .then(() => log("打开本地音视频设备成功"))
                    .catch(() => log("打开本地音视频设备失败"));
            }

            break;
        case TYPE_COMMAND_ROOM_LIST:
            let roomList = document.getElementById("roomList");
            //这个方法会少删子节点，不知为何，用另一个方法
            /*roomList.childNodes.forEach((node) =>{
                roomList.removeChild(node);
            });*/
            //当div下还存在子节点时 循环继续
            while (roomList.hasChildNodes()) {
                roomList.removeChild(roomList.firstChild);
            }
            JSON.parse(message.message).forEach((roomId) => {
                let item = document.createElement("div");
                let label = document.createElement("label");
                label.setAttribute("for", roomId);
                label.innerText = "房间号：";
                let span = document.createElement("span");
                span.innerText = roomId;
                let button = document.createElement("button");
                button.innerText = "加入房间";
                button.onclick = () => websocket.send(JSON.stringify({
                    command: TYPE_COMMAND_ROOM_ENTER,
                    userId: userId,
                    roomId: roomId
                }));
                item.append(label, span, button);
                roomList.append(item);
            });
            break;
        case TYPE_COMMAND_DIALOGUE:
            let dialogue = document.createElement("p").innerText = message.userId + ":" + message.message;
            let br = document.createElement("br");
            document.getElementById("dialogueList").append(dialogue, br);
            break;
        case TYPE_COMMAND_READY:
            if (caller) {
                //初始化一个webrtc端点
                rtcPeerConnection = new RTCPeerConnection(iceServers);
                //添加事件监听函数
                rtcPeerConnection.onicecandidate = onIceCandidate;
                rtcPeerConnection.ontrack = onTrack;

                rtcPeerConnection.addTrack(localMediaStream);
                rtcPeerConnection.createOffer()
                    .then(
                        setLocalAndOffer
                    )
                    .catch(
                        log("createOffer,error:")
                    );
            }
            break;
        case TYPE_COMMAND_OFFER:
            if (!caller) {
                //初始化一个webrtc端点
                rtcPeerConnection = new RTCPeerConnection(iceServers);
                //添加事件监听函数
                rtcPeerConnection.onicecandidate = onIceCandidate;

                rtcPeerConnection.onatrack = onTrack;

                rtcPeerConnection.addTrack(localMediaStream);
                rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(message.message.sdp));
                rtcPeerConnection.createAnswer()
                    .then(
                        setLocalAndAnswer
                    )
                    .catch(
                        log("error")
                    );
            }
            break;
        case TYPE_COMMAND_ANSWER:
            rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
            break;
        case TYPE_COMMAND_CANDIDATE:
            let candidate = new RTCIceCandidate({
                sdpMLineIndex: message.message.label,
                candidate: message.message.candidate
            });
            rtcPeerConnection.addIceCandidate(candidate);
            break;
    }


};

//打开本地音视频,用promise这样在打开视频成功后，再进行下一步操作
const openLocalMedia = () => {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then((stream) => {
                //make stream available to browser console(设置不设置都没问题)
                //window.stream = mediaStream;
                //localVideo.srcObject = mediaStream;
                localMediaStream = stream;
                let localVideo = document.getElementById("localVideo");
                localVideo.srcObject = localMediaStream;
                localVideo.play();
            })
            .then(() => resolve())
            .catch(() => reject());
    });

};

const onTrack = (event) =>{
    remoteMediaStream = event.stream;
    let remoteVideo = document.getElementById("remoteVideo");
    remoteVideo.srcObject = remoteMediaStream;
    remoteVideo.play();

};

const onIceCandidate = (event) =>{
    if (event.icecandidate) {
        log("sending ice candidate");
        websocket.send(JSON.stringify({
            command: TYPE_COMMAND_CANDIDATE,
            userId: userId,
            roomId: roomId,
            message: {
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }
        }));

    }
};

const setLocalAndOffer = (sessionDescription) => {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    websocket.send(
        JSON.stringify({
            command: TYPE_COMMAND_OFFER,
            userId: userId,
            roomId: roomId,
            message: {
                sdp: sessionDescription,
            }
        })
    );
};



const setLocalAndAnswer = (sessionDescription) => {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    websocket.send(
        JSON.stringify({
            command: TYPE_COMMAND_ANSWER,
            userId: userId,
            roomId: roomId,
            message: {
                sdp: sessionDescription,
            }
        })
    );
};

