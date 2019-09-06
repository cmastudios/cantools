declare namespace CAN {
    interface Message {
        frame_id: number;
        name: string;
        size: number;
        sender: string;
        signals: Signal[];
    }

    interface Signal {
        name: string;
        start: number;
        size: number
        scale: number;
        offset: number;
        min: number;
        max: number;
        units: string;
        littleendian: boolean;
        negative: boolean;
    }
}