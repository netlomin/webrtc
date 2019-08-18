package com.caiwei.webrtc.model;

import lombok.Data;

/**
 * @ClassName: Message
 * @Description: TODO
 * @auther: caiwei
 * @date: 2019/8/17 18:57
 */
@Data
public class Message {

    public static final String TYPE_COMMAND_ROOM_ENTER = "enterRoom";
    public static final String TYPE_DIALOGUE = "dialogue";

    public static final String TYPE_COMMAND_ROOM_LIST = "roomList";

    public static final String TYPE_COMMAND_REMOTER_READY = "remoteReady";

    private String command;
    private String userId;
    private String roomId;
    private String message;

}
