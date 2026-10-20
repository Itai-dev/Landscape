import Questionnaire from "./Questionnaire";
import RefCapture from "@/components/RefCapture";

export const metadata = { title: "סקר התעריפים 2026", robots: { index: false } };

export default function Page() {
  return (
    <div className="wrap narrow">
      <RefCapture />
      <div className="crumbs"><a href="/survey">סקר התעריפים ותנאי התשלום 2026</a></div>
      <Questionnaire />
    </div>
  );
}
