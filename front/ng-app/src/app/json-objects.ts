export class Avatar {
    picture: string;
    picture_for_profile: string;
    picture_for_preview: string;
}

export class User {
    id: number;
    email: string;
    username: string;
    password: string;
    confirm_password?: string;
    avatarimage?: Avatar;
    tagline: string;
    is_online: boolean;
    // these exist in frontend only:
    newMessages?: Message[];
}

export class Room {
    id: number;
    name?: string;
    label?: string;
    members: User[];
    messages?: number[];
}

export class Message {
    id?: number;
    room: number;
    handle?: string;
    message: string;
    timestamp: Date;
    author: User;
    checked: boolean;
    encrypted: boolean;
    // these exist in frontend only:
    sent: boolean;
    notdecoded: boolean
}
