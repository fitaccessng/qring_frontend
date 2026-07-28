import { MessageCircle, PhoneCall } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EstateList, EstateListItem, EstateMobilePage, estatePrimaryButtonClass } from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateAudioCallsPage() {
  const navigate = useNavigate();
  return (
    <EstateMobilePage title="Audio Calls" subtitle="Start a secure voice call from a visitor thread" icon={PhoneCall} iconClassName="text-emerald-600" onBack={() => navigate(-1)}>
      <EstateList>
        <EstateListItem>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">Choose a conversation</h2>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">Open your visitor inbox and select an active session to begin a secure voice call.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/homeowner/messages")} className={`mt-4 w-full ${estatePrimaryButtonClass}`}>
            <MessageCircle className="h-4 w-4" />
            Open Messages
          </button>
        </EstateListItem>
      </EstateList>
    </EstateMobilePage>
  );
}
