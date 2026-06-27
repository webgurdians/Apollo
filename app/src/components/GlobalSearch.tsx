import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Input } from "@/components/ui/input";
import { Search, X, User, Calendar, Receipt, Stethoscope, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { format } from "date-fns";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, isFetching } = trpc.search.global.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 },
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const totalResults = data
    ? data.patients.length + data.appointments.length + data.bills.length + data.doctors.length
    : 0;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search patients, appointments, bills... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-8"
        />
        {query && (
          <button onClick={() => { setQuery(""); setDebouncedQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div ref={panelRef} className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          {isFetching ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : totalResults === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No results found for "{debouncedQuery}"
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {data?.patients.map((p) => (
                <button
                  key={`p-${p.id}`}
                  onClick={() => { navigate(`/front-desk`); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sky-50 text-left"
                >
                  <User className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.phone} · {p.status}</div>
                  </div>
                </button>
              ))}
              {data?.appointments.map((a) => (
                <button
                  key={`a-${a.id}`}
                  onClick={() => { navigate(`/admin`); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sky-50 text-left"
                >
                  <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.name} - {a.service}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.preferredDate), "MMM d, yyyy")} · {a.status}
                    </div>
                  </div>
                </button>
              ))}
              {data?.bills.map((b) => (
                <button
                  key={`b-${b.id}`}
                  onClick={() => { navigate(`/admin`); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sky-50 text-left"
                >
                  <Receipt className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">Bill #{b.id} - {b.patientName}</div>
                    <div className="text-xs text-muted-foreground">₹{b.total} · {b.status}</div>
                  </div>
                </button>
              ))}
              {data?.doctors.map((d) => (
                <button
                  key={`d-${d.id}`}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sky-50 text-left"
                >
                  <Stethoscope className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">Dr. {d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.specialty}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
