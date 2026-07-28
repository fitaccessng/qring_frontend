import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EstateList, EstateListItem, EstateMobilePage, EstateStatusPill, estatePrimaryButtonClass } from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstatePanicPage() {
  const navigate = useNavigate();
  return (
    <EstateMobilePage title="Emergency" subtitle="Reach estate security from the protected panic console" icon={ShieldAlert} iconClassName="text-rose-600" onBack={() => navigate(-1)}>
      <EstateList>
        <EstateListItem>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black">Panic console</h2>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">Alert estate security and your configured emergency contacts from the protected safety screen.</p>
              </div>
            </div>
            <EstateStatusPill tone="rose">Urgent</EstateStatusPill>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/homeowner/safety")} className={`mt-4 w-full ${estatePrimaryButtonClass}`}>
            Open Panic Console
          </button>
        </EstateListItem>
      </EstateList>
    </EstateMobilePage>
  );
}
