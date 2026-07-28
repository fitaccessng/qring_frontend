import { MessageCircle, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EstateList, EstateListItem, EstateMobilePage, estatePrimaryButtonClass } from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateVideoCallsPage() {
  const navigate = useNavigate();
  return (
    <EstateMobilePage title="Video Calls" subtitle="Start a secure video call from a visitor thread" icon={Video} iconClassName="text-cyan-600" onBack={() => navigate(-1)}>
      <EstateList>
        <EstateListItem>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
              <Video className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">Choose a conversation</h2>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">Open your visitor inbox and select an active session to begin a secure video call.</p>
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
