package com.caiwei.webrtc.service;

import com.caiwei.webrtc.websocket.Connection;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * @ClassName: RoomService
 * @Description: websocket房间服务
 * @auther: caiwei
 * @date: 2019/8/17 18:05
 */
@Service
public class RoomService {

    private ConcurrentMap<String,Set<Connection>> rooms = new ConcurrentHashMap<>();


    /**
     * 加入指定的房间
     */
    public String enterRoom(String roomId, Connection connection) {
        Set<Connection> room =rooms.get(roomId);
        if(room == null){
            rooms.put(roomId, new HashSet<>());
            room =rooms.get(roomId);
            room.add(connection);
            return "created";
        }else {
            room.add(connection);
            return "joined";
        }
    }

    /**
     * 离开指定的房间
     */
    public void leaveRoom(String roomId, Connection connection) {
        if (roomId != null) {
            Set<Connection> room = rooms.get(roomId);
            if (room != null) {
                room.remove(connection);
                if (room.size() == 0) {
                    rooms.remove(roomId);
                }
            }
        }

    }

    /**
     * 查询指定房间人数（包括自己）
     */
    public Integer queryCountInRoom( String roomId){
        Set<Connection> room = rooms.get(roomId);
        if (room == null) {
            return 0;
        } else {
            return room.size();
        }

    }

    /**
     * 将用户踢出房间
     */
    public void removeUserFromRoom( String roomId, String userId){
        Set<Connection> room = rooms.get(roomId);
        if (room != null) {
            for (Connection user : room) {
                if (user.getUserId().equals(userId)) {
                    room.remove(user);
                }
            }
        }

    }

    /**
     * 通过房间Id查询房间
     */
    public Set<Connection> queryRoomById(String roomId){

        return rooms.get(roomId);
    }

    /**
     * 查询所有存在的房间名称
     */
    public Set<String> queryAllRoomName(){
        return rooms.keySet();
    }

}
