import { WorksheetBlock } from "@/types/worksheet";

export const SPIKE_SAMPLE_WORKSHEET_BLOCKS: WorksheetBlock[] = [
  {
    id: "b-1",
    type: "heading",
    level: 1,
    content: "Sich vorstellen auf Deutsch",
    visibility: "both",
  },
  {
    id: "b-2",
    type: "text",
    content:
      "<p>Hallo! Ich heiße Anna und komme aus Bern. Ich lerne Deutsch, weil ich in Berlin arbeiten möchte.</p>",
    visibility: "both",
  },
  {
    id: "b-3",
    type: "image",
    src: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg",
    alt: "People studying together",
    visibility: "both",
  },
  {
    id: "b-4",
    type: "page-break",
    visibility: "both",
  },
  {
    id: "b-5",
    type: "heading",
    level: 2,
    content: "Kurzpräsentation",
    visibility: "both",
  },
  {
    id: "b-6",
    type: "text",
    content:
      "<p>Ich wohne in Winterthur. In meiner Freizeit spiele ich Fußball und höre Podcasts auf Deutsch.</p>",
    visibility: "both",
  },
];
