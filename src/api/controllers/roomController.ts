import { Server, Socket } from "socket.io";
import {
  OnMessage,
  SocketController,
  SocketIO,
  ConnectedSocket,
  MessageBody,
} from "socket-controllers";

interface RestartGameMessage {
  ownState: "x" | "o";
  winState: string;
  roomId: string;
}

@SocketController()
export class RoomController {
  @OnMessage("join_game")
  public async joinGame(
    @SocketIO() io: Server,
    @ConnectedSocket() socket: Socket,
    @MessageBody() message: any
  ) {
    console.log("Joining game", message);
    const connectedSockets = io.sockets.adapter.rooms.get(message.roomId);
    const socketRooms = Array.from(socket.rooms.values()).filter(
      (r) => r !== socket.id
    );

    if (
      socketRooms.length > 0 ||
      (connectedSockets && connectedSockets.size == 2)
    ) {
      socket.emit("room_join_error", {
        error: "Room is full",
      });
    } else {
      await socket.join(message.roomId);
      socket.emit("room_joined");

      if (io.sockets.adapter.rooms.get(message.roomId).size === 2) {
        socket.emit("start_game", { start: true, symbol: "x" });
        socket
          .to(message.roomId)
          .emit("start_game", { start: false, symbol: "o" });
      }
    }
  }
  // restart game
  @OnMessage("restart_game")
  public async restartGame(
    @SocketIO() io: Server,
    @ConnectedSocket() socket: Socket,
    @MessageBody() message: RestartGameMessage
  ) {
    console.log("restarting game", message);
    const winState = message.winState;
    const ownState = message.ownState;

    const getOppositeSymbol = (symbol: "x" | "o") => {
      if (symbol == "x") {
        return "o";
      } else {
        return "x";
      }
    };

    const playerWon = () => {
      return message.winState == message.ownState;
    };

    if (winState == "tie") {
      socket.emit("start_game", {
        start: true,
        symbol: ownState,
      });
      socket.to(message.roomId).emit("start_game", {
        start: false,
        symbol: getOppositeSymbol(message.ownState),
      });
    } else {
      if (playerWon()) {
        socket.emit("start_game", {
          start: true,
          symbol: ownState,
        });
        socket.to(message.roomId).emit("start_game", {
          start: false,
          symbol: getOppositeSymbol(ownState),
        });
      }
    }
  }
}
