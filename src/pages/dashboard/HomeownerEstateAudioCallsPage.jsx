import { MessageCircle, PhoneCall } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EstateList, EstateListItem, EstateMobilePage, estatePrimaryButtonClass } from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateAudioCallsPage() {
  const navigate = useNavigate();

  return (
    <EstateMobilePage title="Audio Calls" icon={PhoneCall} iconClassName="text-emerald-600" onBack={() => navigate(-1)}>
      <EstateList>
        <EstateListItem className="py-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <PhoneCall className="h-6 w-6" />
          </div>

          <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Select a conversation to start a call
          </h2>

          <button
            type="button"
            onClick={() => navigate("/dashboard/homeowner/messages")}
            className={`mt-5 w-full justify-center ${estatePrimaryButtonClass}`}
          >
            <MessageCircle className="h-4 w-4" />
            Open Inbox
          </button>
        </EstateListItem>
      </EstateList>
    </EstateMobilePage>
  );
}