export interface Cafe {
  slug: string;
  name: string;
  chapter: string;
  map_location: string | null;
  imageUrl?: string;
  mapUrl?: string;
  espresso_price: string | null;
  cappuccino_price: string | null;
  americano_price: string | null;
  wifi_speed: string | null;
  background_music: boolean | null;
  quiet_vibes: boolean | null;
  has_prayer_room: boolean | null;
  has_kids_area: boolean | null;
  has_private_room: boolean | null;
  has_ac: boolean | null;
  has_power_outlets: boolean | null;
  notes: string | null;
}

export type EventStatus = "published" | "draft";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  cafeId?: string;
  imageUrl?: string;
  mapUrl?: string;
  status: EventStatus;
  tags: string[];
  createdAt: string;
}

export type SubmissionStatus =
  | "signed_up"
  | "invited"
  | "requested_to_join"
  | "approved"
  | "rejected";

export interface Submission {
  id: string;
  name: string;
  city: string;
  role: string;
  whatsapp: string;
  referralSource: string;
  referralName?: string;
  invitationStatus: SubmissionStatus;
  allowedNextStatuses?: SubmissionStatus[];
  invited_at?: string;
  approved_by?: string;
  approved_at?: string;
  updated_by?: string;
  updated_at?: string;
  createdAt: string;
}

export type InquiryStatus = "new" | "contacted" | "closed";

export interface ProjectInquiry {
  id: string;
  name: string;
  contact: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}
