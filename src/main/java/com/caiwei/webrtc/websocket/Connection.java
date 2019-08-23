package com.caiwei.webrtc.websocket;


import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.caiwei.webrtc.config.ConfiguratorForClientIp;
import com.caiwei.webrtc.model.Message;
import com.caiwei.webrtc.service.CommandService;
import com.caiwei.webrtc.service.ForwardMessageService;

import com.caiwei.webrtc.service.RoomService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;


import javax.websocket.*;

import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * @ClassName: WebSocketServer
 * @Description: @ServerEndpoint不是单例模式
 * @auther: caiwei
 * @date: 2019/8/15 11:13
 */
@ServerEndpoint(value = "/websocket",configurator = ConfiguratorForClientIp.class)
@Component
@Slf4j
@Data
public class Connection {

    //在线总人数
    private static volatile AtomicInteger onlineCount = new AtomicInteger(0);

    private static RoomService roomService;
    @Autowired
    public void setRoomService(RoomService roomService) {
        Connection.roomService = roomService;
    }


    private static ForwardMessageService dialogueService;
    @Autowired
    public void setDialogueService(ForwardMessageService dialogueService) {
        Connection.dialogueService = dialogueService;
    }


    private static CommandService commandService;
    @Autowired
    public void setCommandService(CommandService commandService) {
        Connection.commandService = commandService;
    }

    //某个客户端的ip
    private String ip;

    //某个客户端的userID
    private String userId;

    //某个客户端的roomNo
    private String roomId;

    //与某个客户端的连接会话，需要通过它来给客户端发送数据
    private Session session;


    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session) {
        this.session = session;
        ip = (String) session.getUserProperties().get("clientIp");
        log.info("用户:"+ip+"连接到服务器,当前在线人数为" + onlineCount.incrementAndGet());
    }
    /**
     * 连接关闭调用的方法
     */
    @OnClose
    public void onClose(Session session) {
        //即使连接错误，回调了onError方法，最终也会回调onClose方法，所有退出房间写在这里比较合适
        roomService.leaveRoom(roomId, this);
        //在线数减1
        log.info("用户:"+ip+"关闭连接，退出房间"+roomId+"当前在线人数为" + onlineCount.addAndGet(-1));
    }

    /**
     * 连接发生错误时调用的方法
     */
    @OnError
    public void onError(Session session, Throwable error) {
        log.error("用户:" + ip + "连接错误");
        error.printStackTrace();
    }

    /**
     * 收到客户端消息后调用的方法
     * @param stringMessage 客户端发送过来的消息*/
    @OnMessage
    public void onMessage(Session session, String stringMessage) {
        Message message = JSON.parseObject(stringMessage, Message.class);
        log.info("收到来自"+ip+"的信息:"+message);
        switch (message.getCommand()) {
            case Message.TYPE_COMMAND_ROOM_ENTER:
                enterRoom(message);
                break;
            case Message.TYPE_COMMAND_DIALOGUE:
                dialogueService.sendMessageForEvery(message);
                break;
            case Message.TYPE_COMMAND_ROOM_LIST:
                getRoomList(message);
                break;
            case Message.TYPE_COMMAND_READY:
                remoteReady();
        }
    }

    private void enterRoom(Message message) {
        this.userId = message.getUserId();
        this.roomId = message.getRoomId();
        message.setMessage(roomService.enterRoom(roomId, this));
        try {
            session.getBasicRemote().sendText(JSON.toJSONString(message));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void getRoomList(Message message) {
        message.setMessage(JSON.toJSONString(roomService.queryAllRoomName(),SerializerFeature.WriteNullListAsEmpty));
        try {
            session.getBasicRemote().sendText(JSON.toJSONString(message));
        } catch (IOException e) {
            log.error("error");
            e.printStackTrace();
        }
    }

    private void remoteReady() {

    }

}
