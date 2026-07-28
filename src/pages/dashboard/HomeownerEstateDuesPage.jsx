import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listMyEstateAlerts, payEstateAlert } from "../../services/estateService";
import { showError } from "../../utils/flash";
import {
  EstateEmptyState,
  EstateList,
  EstateListItem,
  EstateLoadingState,
  EstateMobilePage,
  EstateSectionHeader,
  EstateStatusPill,
  estatePrimaryButtonClass
} from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateDuesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setItems((await listMyEstateAlerts()).filter((item) => item.alertType === "payment_request"));
    } catch (error) {
      showError(error?.message || "Unable to load dues");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  async function handlePay(item) {
    setPayingId(item.id);
    try {
      await payEstateAlert(item.id);
      await load(true);
    } catch (error) {
      showError(error?.message || "Unable to start payment");
    } finally {
      setPayingId("");
    }
  }

  return (
    <EstateMobilePage
      title="Estate Dues"
      subtitle="Payments requested by estate management"
      icon={CreditCard}
      iconClassName="text-amber-600"
      onBack={() => navigate(-1)}
    >
      {loading ? (
        <EstateLoadingState label="Payments" />
      ) : items.length ? (
        <section>
          <EstateSectionHeader label="Payment Requests" count={items.length} />
          <EstateList>
            {items.map((item) => {
              const paid = item.myPayment?.status === "paid";
              return (
                <EstateListItem key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <EstateStatusPill tone={paid ? "emerald" : "amber"}>{paid ? "Paid" : "Pending"}</EstateStatusPill>
                      <h2 className="mt-2 truncate text-sm font-black">{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description || "Estate payment request"}</p>
                    </div>
                    <strong className="shrink-0 text-base font-black">₦{Number(item.amountDue || 0).toLocaleString()}</strong>
                  </div>
                  {!paid ? (
                    <button
                      type="button"
                      onClick={() => handlePay(item)}
                      disabled={payingId === item.id}
                      className={`mt-3 w-full ${estatePrimaryButtonClass}`}
                    >
                      {payingId === item.id ? "Opening payment..." : "Make Payment"}
                    </button>
                  ) : null}
                </EstateListItem>
              );
            })}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={CreditCard} title="No payment requests" message="New estate dues and payment requests will appear here." />
      )}
    </EstateMobilePage>
  );
}
