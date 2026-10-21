import { isOpen } from "@/lib/survey/config";

// A slim line pointing to the rates survey while it's open.
export default function SurveyBanner() {
  if (!isOpen()) return null;
  return (
    <p className="survey-banner">
      <span><b>סקר התעריפים 2026</b>: 4 דקות, ותראו כמה גובים אחרים בתחום שלכם</span>
      <a href="/survey" data-track="survey_banner_click">לענות על הסקר ‹</a>
    </p>
  );
}
