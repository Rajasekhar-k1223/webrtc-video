const express = require("express");
const { message } = require("laravel-mix/src/Log");
const users = [];
const app = express();
const server = require("http").createServer(app);
let allowedHost = "0.0.0.0"; // the hostname which is allowed to access the backend
let port = 3006; // desired port
let host = "0.0.0.0"; // desired host; 0.0.0.0 to host on your ip
const io = require("socket.io")(server, {
    cors: {
        origin: "https://mibook.in",
        methods: ["GET", "POST"],
    },
});
const axios = require("axios");
let onlineUsers = [];
const userToSocketIdMap = new Map();
const socketIdToUserMap = new Map();
const addNewUser = (username, socketId) => {
    // console.log(`New message from ${socketId}: ${username}`);
    !onlineUsers.some((user) => user.username === username) &&
        onlineUsers.push({ username, socketId });
};

const removeUser = (socketId) => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const getUser = (username) => {
    //console.log(username)
    return onlineUsers.find(
        (user) => parseInt(user.username) === parseInt(username)
    );
};
io.on("connection", (socket) => {
    // console.log(socket);
    socket.on("room:join", (data) => {
        console.log(data);
        const { userId, to, from, email, roomId } = data;
        const getuserdata = getUser(parseInt(from));
        const getTodata = getUser(parseInt(to));
        console.log(getuserdata);
        userToSocketIdMap.set(email, getuserdata.socketId);
        socketIdToUserMap.set(getuserdata.socketId, email);
        io.to(roomId).emit("user:joined", {
            email,
            userId: userId,
            id: getuserdata.socketId,
        });
        socket.join(roomId);
        if (to != null) {
            io.to(getTodata.socketId).emit("incoming-call-to", data);
        }
        io.to(getuserdata.socketId).emit("room:join", data);
        // console.log(data);
        // const { userId, room, emailId } = data;
        // const receiver = getUser(userId);
        // userToSocketIdMap.set(userId, receiver.socketId);
        // socketIdToUserMap.set(receiver.socketId, userId);
        // // io.to(room).emit("user:joined", { userId, id: socketId.socketId });
        // socket.join(room);
        // socket.emit("room:join", data);
        // io.to(receiver.socketId).emit("calling-Request", {
        //     room,
        //     userId,
        //     emailId,
        // });
        //  io.to(socketId.socketId).emit("room:join", data);
    });

    socket.on("user:call", ({ to, offer }) => {
        console.log("user-called");
        io.to(to).emit("incomming:call", { from: socket.id, offer });
    });

    socket.on("call:accepted", ({ to, ans }) => {
        io.to(to).emit("call:accepted", { from: socket.id, ans });
    });

    socket.on("peer:nego:needed", ({ to, offer }) => {
        console.log("peer:nego:needed", offer);
        io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    });

    socket.on("peer:nego:done", ({ to, ans }) => {
        console.log("peer:nego:done", ans);
        io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });

    socket.emit("me", socket.id);
    // console.log("login");
    // console.log(socket);
    // console.log(socket.id);
    // socket.on("newUser", (username) => {
    //     addNewUser(username, socket.id);
    //   });
    // console.log("connection");
    // const userList = [];
    // axios
    //     .get("http://127.0.0.1:8000/api/getAllUsers")
    //     .then((response) => {
    //         // userList.push(response.data.data.userId);
    //         console.log("users");
    //         // userList.push(response.data.data);
    //         //console.log(response.data.data);
    //         console.log(response.data.data);
    //         socket.emit("LoginUserList", response.data.data);
    //     })
    //     .catch((error) => {
    //         console.log(error);
    //     });
    // console.log(userList);
    socket.on("join-room", (data) => {
        const { roomId, userId, emailId } = data;
        console.log(roomId);
        console.log(emailId);
        userToSocketIdMap.set(emailId, socket.id);
        socketIdToUserMap.set(socket.id, emailId);
        socket.join(roomId);
        socket.emit("joined-room", { roomId });
        const reciver = getUser(userId);
        console.log(reciver);
        io.to(reciver.socketId).emit("calling-Request", {
            roomId,
            userId,
            emailId,
        });
        //  socket.broadcast.to(roomId).emit("user-joined",{emailId});
    });
    socket.on("Accept-Room", (data) => {
        const { roomId, userId, emailId } = data;
        console.log(roomId);
        console.log(emailId);
        console.log("Room-Accepted");
        userToSocketIdMap.set(emailId, socket.id);
        socketIdToUserMap.set(socket.id, emailId);
        socket.join(roomId);
        socket.emit("joined-room", { roomId });
        const reciver = getUser(userId);
        console.log(reciver);
        io.to(reciver.socketId).emit("user-joined", { emailId });
    });
    socket.on("call-user", (data) => {
        const { emailId, offer } = data;
        console.log("checking user offer");
        console.log(emailId);
        console.log(offer);
        const fromEmail = socketIdToUserMap.get(socket.id);
        const socketId = userToSocketIdMap.get(emailId);
        console.log(socketId);
        console.log(fromEmail);
        socket.to(socketId).emit("incoming-call", { from: fromEmail, offer });
    });
    socket.on("call-accepted", (data) => {
        const { emailId, ans } = data;
        const socketId = userToSocketIdMap.get(emailId);
        io.to(socketId).emit("call-accepted", { ans });
    });
    socket.on("FrdsonLine", ({ loginId, userList }) => {
        const checkonline = userList.map((userItem) => {
            const userOn = getUser(userItem.userId);
            console.log(userOn);
            if (userOn != undefined) {
                if (parseInt(userOn.username) === parseInt(userItem.userId)) {
                    let userLeton = {
                        userId: parseInt(userOn.username),
                        userOn: true,
                    };
                    return userLeton;
                } else {
                    let userLeton = {
                        userId: parseInt(userOn.username),
                        userOn: false,
                    };
                    return userLeton;
                }
            } else {
                let userLeton = {
                    userId: userItem.userId,
                    userOn: false,
                };
                return userLeton;
            }
        });
        // const checkonline = onlineUsers.map((user) => {
        //     var useron = [];
        //     // console.log(onlineUsers);
        //     // console.log(user);
        //     // console.log(userList[0].userId);
        //     // console.log(parseInt(user.username));
        //     if (userList[0].userId === parseInt(user.username)) {
        //         let userLeton = {
        //             userId: parseInt(user.username),
        //             userOn: true,
        //         };
        //         return userLeton;
        //     }
        // });
        const receiver = getUser(loginId);
        receiver?.socketId != undefined
            ? io.to(receiver.socketId).emit("getOnlinefrds", checkonline)
            : null;
    });
    socket.on("newUser", (username) => {
        //  console.log(socket);
        // console.log(`New message from ${socket.id}: ${username}`);
        addNewUser(username, socket.id);
        console.log(onlineUsers);
    });

    socket.on(
        "sendNotification",
        ({ senderID, senderName, receiverID, type }) => {
            const receiver = getUser(receiverID);
            if (receiver) {
                io.to(receiver.socketId).emit("getNotification", {
                    senderName,
                    receiverID,
                    type,
                });
            } else {
                console.log(onlineUsers);
                console.log(receiver);
            }
        }
    );
    socket.on("AcceptFriendRequest", async (AuthDetails) => {
        let data = JSON.stringify({
            from: AuthDetails.from,
            to: AuthDetails.to,
            status: "Accept",
        });
        let config = {
            method: "get",
            maxBodyLength: Infinity,
            url: "http://127.0.0.1:8000/api/friendRequestAcceptance",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + AuthDetails.token,
            },
            data: data,
        };

        axios
            .request(config)
            .then((response) => {
                const receiver = getUser(AuthDetails.from);
                const sender = getUser(AuthDetails.to);
                if (receiver) {
                    const senderName = AuthDetails.toName;
                    const type = "Now both are connected";
                    io.to(receiver.socketId).emit("getNotificationAcceptfrom", {
                        senderName,
                        type,
                    });
                } else {
                    console.log(onlineUsers);
                    console.log(receiver);
                }

                if (sender) {
                    const type = "Accept Your Request";
                    const senderName = AuthDetails.fromName;
                    io.to(sender.socketId).emit("getNotificationAcceptto", {
                        senderName,
                        type,
                    });
                } else {
                    console.log(onlineUsers);
                    console.log(receiver);
                }
            })
            .catch((error) => {
                console.log(error);
            });

        // const res = await axios
        //     .get("http://127.0.0.1:8000/api/friendRequestAcceptance", config)
        //     .then((response) => {
        //         console.log(response.data);
        // const receiver = getUser(AuthDetails.from);
        // if (receiver) {
        //     const senderName = AuthDetails.fromName;
        //     const type = "Accept Your Request";
        //     io.to(receiver.socketId).emit("getNotificationAcceptfrom", {
        //         senderName,
        //         type,
        //     });
        // } else {
        //     console.log(onlineUsers);
        //     console.log(receiver);
        // }
        // const sender = getUser(AuthDetails.to);
        // if (sender) {
        //     const type = "Now both are connected";
        //     const senderName = AuthDetails.toName;
        //     io.to(sender.socketId).emit("getNotificationAcceptto", {
        //         senderName,
        //         type,
        //     });
        // } else {
        //     console.log(onlineUsers);
        //     console.log(receiver);
        // }
        // })
        // .catch((e) => {
        //     console.log(e);
        // });
    });

    socket.on("sendText", ({ senderName, receiverName, text }) => {
        const receiver = getUser(receiverName);
        io.to(receiver.socketId).emit("getText", {
            senderName,
            text,
        });
    });
    socket.on("callfromVideo", ({ userData, userId }) => {
        const receiver = getUser(userData.userId);
        const sender = getUser(userId);
        const type = "Calling";
        if (receiver) {
            io.to(receiver.socketId).emit("CallAcceptance", {
                userData,
                userId,
                type,
            });
        }
        if (sender) {
            io.to(sender.socketId).emit("CallAcceptanceSender", {
                userData,
                userId,
                type,
            });
        }
    });
    socket.on("callAccepted", ({ userData, userId }) => {
        const receiver = getUser(userData.userId);
        const sender = getUser(userId);
        console.log(receiver);
        const type = "call Accepted";
        if (receiver) {
            io.to(receiver.socketId).emit("callAcceptedres", {
                userData,
                userId,
                type,
            });
        }
        if (sender) {
            io.to(sender.socketId).emit("callAcceptedresSender", {
                userData,
                userId,
                type,
            });
        }
    });
    socket.on("callRejected", (user) => {
        const receiver = getUser(user.userId);
        io.to(receiver.socketId).emit("callRejectedRes", {
            user,
            type,
        });
    });

    socket.on("disconnect", () => {
        removeUser(socket.id);
    });
    socket.on("JoinServer", (userName) => {
        const user = {
            userName,
            id: socket.id,
        };
        users.push(user);
        io.emit("new user", user);
    });
    socket.on("JoinRoom", (roomName, users) => {
        socket.join(roomName);
        cb(message[roomName]);
    });
    socket.on("sendChatToServer", (message) => {
        //   console.log(message);
        //i
        const newMess = {
            message: message.message,
            from: message.from,
            to: message.to,
        };
        console.log("check url");
        console.log(newMess);
        axios
            .post("http://127.0.0.1:8000/api/SendMessageToFriend", newMess, {
                headers: {
                    Authorization: "Bearer " + message.token,
                },
            })
            .then((response) => {
                // userList.push(response.data.data.userId);
                //   console.log("users");
                // userList.push(response.data.data);
                //console.log(response.data.data);
                //  console.log(response);
                let newMessage = {
                    connectId: socket.id,
                    message: response.data,
                };
                console.log(newMessage);
                console.log(socket.id);
                io.emit("sendChatToClient", newMessage);
                //  console.log(response.data.data);
                //  socket.emit("LoginUserList", response.data.data);
            })
            .catch((error) => {
                console.log(error);
            });

        // o.sockets.emit("sendChatToClient", message);
        // let message = {
        //     connectId: socket.id,
        //     message: message,
        // };
    });
    // socket.emit("RequestUser", socket.id);
    // socket.on("callUser", (data) => {
    //     console.log(data)
    //     const receiver = getUser(data.userToCall);
    //     io.to(receiver.socketId).emit("callUser", {
    //         signal: data.signalData,
    //         from: data.from,
    //         name: data.name,
    //     });
    // });

    // socket.on("answerCall", (data) => {
    //     console.log(data);
    //     console.log("answercall")
    //     io.to(data.to).emit("callAccepted", data.signal);
    // });

    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        const receiver = getUser(userToCall);
        io.to(receiver.socketId).emit("callUser", {
            signal: signalData,
            from,
            name,
        });
    });
    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal);
    });

    // socket.on("disconnect", () => {
    //     console.log("Disconnect");
    // });
});
server.listen(port, allowedHost, () => {
    console.log(`The server is running on http://${allowedHost}:${port}`);
});
