import { isOpen } from "@/lib/survey/config";

// A slim line pointing to the rates survey while it's open.
export default function SurveyBanner() {
  if (!isOpen()) return null;
  return (
    <p className="survey-banner">
      <span><b>סקר התעריפים ותנאי התשלום 2026</b><span className="sb-desc">: כמה גובים בתעשייה ומתי משלמים. 4 דקות, אנונימי.</span></span>
      <a href="/survey">לענות על הסקר ‹</a>
    </p>
  );
}
