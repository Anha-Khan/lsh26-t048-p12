import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Home,
  List,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Target,
  Upload,
  Wallet,
  X,
} from "lucide-react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const CATEGORY_COLORS = {
  Rent: "#173c32",
  Groceries: "#6f8b79",
  Food: "#a9b4a9",
  Transport: "#c5cbc4",
  Utilities: "#8f9c91",
  Mobile: "#d4d8d2",
  Entertainment: "#aab7ad",
  Education: "#bac4bb",
  Health: "#c3cbc4",
  Clothing: "#d0d5cf",
};

const DEMO_SAVED = [6000000, 2400000, 1800000];

const CATEGORIES = [
  "Groceries",
  "Food",
  "Transport",
  "Utilities",
  "Mobile",
  "Health",
  "Education",
  "Entertainment",
  "Clothing",
  "Rent",
];

function readLocal(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function toPaisa(value) {
  const parsed = Math.abs(
    Number(
      String(value ?? "").replace(
        /[^0-9.-]/g,
        ""
      )
    )
  );

  return Number.isFinite(parsed)
    ? Math.round(parsed * 100)
    : 0;
}

function money(paisa, decimals = false) {
  return `৳${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format((paisa || 0) / 100)}`;
}

function percent(value) {
  return `${Math.abs(value || 0).toFixed(1)}%`;
}

function sum(items, pick = (item) => item.amountPaisa) {
  return items.reduce(
    (total, item) => total + pick(item),
    0
  );
}

function capToBudget(items, salaryPaisa) {
  let left = Math.max(0, salaryPaisa);

  return items.map((item) => {
    const raw =
      item.amountPaisa ?? item.value;

    const shown = Math.min(
      raw,
      Math.max(0, left)
    );

    left -= shown;

    return { ...item, displayPaisa: shown };
  });
}

function monthName(monthKey) {
  const [year, month] = monthKey
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function completionLabel(today, months) {
  if (months === null) return "No date yet";
  if (months === 0) return "Already funded";

  const date = new Date(`${today}T12:00:00`);
  date.setMonth(date.getMonth() + months);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function dpsProjection(
  monthlyPaisa,
  months,
  annualRatePercent
) {
  if (!monthlyPaisa || months === null) {
    return {
      balancePaisa: 0,
      depositsPaisa: 0,
      interestPaisa: 0,
    };
  }

  let balancePaisa = 0;

  for (let index = 0; index < months; index += 1) {
    balancePaisa += monthlyPaisa;

    balancePaisa += Math.round(
      (balancePaisa * annualRatePercent) /
      12 /
      100
    );
  }

  const depositsPaisa = monthlyPaisa * months;

  return {
    balancePaisa,
    depositsPaisa,
    interestPaisa: balancePaisa - depositsPaisa,
  };
}

function calculatePocket(
  pocket,
  affordablePaisa,
  today,
  annualRatePercent
) {
  let months = null;

  if (pocket.savedPaisa >= pocket.targetPaisa) {
    months = 0;
  } else if (affordablePaisa > 0) {
    let balance = pocket.savedPaisa;
    let count = 0;

    while (
      balance < pocket.targetPaisa &&
      count < 600
    ) {
      balance += affordablePaisa;
      count += 1;
    }

    months = count < 600 ? count : null;
  }

  return {
    months,
    completion: completionLabel(today, months),
    dps: dpsProjection(
      affordablePaisa,
      months,
      annualRatePercent
    ),
  };
}

function WelcomeScreen({
  defaultSalary,
  onSubmit,
}) {
  function submitWelcome(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    onSubmit({
      name: String(form.get("name")).trim(),
      salary: String(form.get("salary")),
    });
  }

  return (
    <main className="welcome-screen">
      <form
        className="welcome-form"
        onSubmit={submitWelcome}
      >
        <p className="welcome-brand">TakaFlow</p>
        <h1>Welcome to your money.</h1>
        <p>
          Start with your name and monthly income.
          You can change both later.
        </p>

        <label>
          Your name
          <input
            name="name"
            required
            autoFocus
            placeholder="Sabbir"
          />
        </label>

        <label>
          Monthly income
          <input
            name="salary"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue={defaultSalary || ""}
            placeholder="50000"
          />
        </label>

        <button className="button primary">
          Start my month
        </button>

        <small>
          Your ledger stays saved on this device.
        </small>
      </form>
    </main>
  );
}

function normalizePocket(pocket, index = 0) {
  return {
    ...pocket,
    name:
      pocket.name ||
      pocket.goal ||
      `Goal ${index + 1}`,
    item: pocket.item || pocket.name || "",
    targetPaisa: toPaisa(
      pocket.targetPaisa ??
        pocket.target_bdt
    ),
    contributionPaisa: toPaisa(
      pocket.contributionPaisa ??
        pocket.monthly_contribution_bdt
    ),
    savedPaisa:
      pocket.savedPaisa ||
      DEMO_SAVED[index] ||
      0,
  };
}

export function App() {
  const [caseData, setCaseData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [salaryPaisa, setSalaryPaisa] = useState(0);
  const [pockets, setPockets] = useState([]);
  const [page, setPage] = useState("home");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [spendingSort, setSpendingSort] =
    useState("recent");
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState(() =>
    typeof window === "undefined"
      ? null
      : readLocal("takaflow-profile")
  );

  const orderRef = useRef(0);

  const [chatText, setChatText] = useState("");
  const [chatStatus, setChatStatus] = useState("idle");
  const [chatDraft, setChatDraft] = useState(null);

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptStatus, setReceiptStatus] = useState("idle");

  const [receiptDraft, setReceiptDraft] = useState({
    shop: "",
    date: "",
    category: "Groceries",
    amount: "",
    amountCandidate: "1186.00",
  });

  useEffect(() => {
    fetch("/data/P12_personal_ledger_public.json")
      .then((response) => response.json())
      .then((payload) => {
        const selected =
          payload.cases.find(
            (item) => item.case_id === "PUB-01"
          ) || payload.cases[0];

        setCaseData(selected);

        const savedLedger = readLocal(
          "takaflow-ledger"
        );

        setSalaryPaisa(
          savedLedger?.salaryPaisa ||
            profile?.salaryPaisa ||
            toPaisa(selected.salary_bdt)
        );

        setExpenses(savedLedger?.expenses || []);

        orderRef.current =
          savedLedger?.expenses?.length || 0;

        setPockets(
          (savedLedger?.pockets || selected.pockets.slice(0, 2))
            .map(normalizePocket)
        );
      })
      .catch((error) => {
        console.error("Failed to load ledger data:", error);
      });
  }, []);

  useEffect(() => {
    if (!caseData || !profile) return;

    window.localStorage.setItem(
      "takaflow-profile",
      JSON.stringify(profile)
    );

    window.localStorage.setItem(
      "takaflow-ledger",
      JSON.stringify({
        salaryPaisa,
        expenses,
        pockets,
      })
    );
  }, [caseData, profile, salaryPaisa, expenses, pockets]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(
      () => setToast(""),
      3200
    );

    return () => window.clearTimeout(timer);
  }, [toast]);

  const metrics = useMemo(() => {
    if (!caseData) return null;

    const day = Number(
      caseData.today.slice(8, 10)
    );

    const current = expenses.filter((expense) =>
      expense.date.startsWith(caseData.months.this)
    );

    const previous = expenses.filter((expense) =>
      expense.date.startsWith(caseData.months.last)
    );

    const previousToDate = previous.filter(
      (expense) =>
        Number(expense.date.slice(8, 10)) <= day
    );

    const previousAfterDate = previous.filter(
      (expense) =>
        Number(expense.date.slice(8, 10)) > day
    );

    const spentPaisa = sum(current);

    const previousToDatePaisa =
      sum(previousToDate);

    const forecastRemainingPaisa =
      sum(previousAfterDate);

    const projectedPaisa =
      spentPaisa + forecastRemainingPaisa;

    const surplusPaisa =
      salaryPaisa - projectedPaisa;

    const remainingPaisa = Math.max(
      0,
      salaryPaisa - spentPaisa
    );

    const changePercent = previousToDatePaisa
      ? ((spentPaisa - previousToDatePaisa) /
        previousToDatePaisa) *
      100
      : 0;

    const categories = new Map();

    current.forEach((expense) => {
      categories.set(
        expense.category,
        (categories.get(expense.category) || 0) +
        expense.amountPaisa
      );
    });

    const categoryRows = [
      ...categories.entries(),
    ]
      .map(([name, value]) => ({
        name,
        value,
        color:
          CATEGORY_COLORS[name] || "#c8c5bd",
      }))
      .sort((a, b) => b.value - a.value);

    const previousCategories = new Map();

    previousToDate.forEach((expense) => {
      previousCategories.set(
        expense.category,
        (previousCategories.get(expense.category) ||
          0) + expense.amountPaisa
      );
    });

    const movements = [
      ...new Set([
        ...categories.keys(),
        ...previousCategories.keys(),
      ]),
    ]
      .map((name) => ({
        name,

        delta:
          (categories.get(name) || 0) -
          (previousCategories.get(name) || 0),
      }))
      .sort(
        (a, b) =>
          Math.abs(b.delta) -
          Math.abs(a.delta)
      );

    const remainingCategories = new Map();

    previousAfterDate.forEach((expense) => {
      remainingCategories.set(
        expense.category,
        (remainingCategories.get(
          expense.category
        ) || 0) + expense.amountPaisa
      );
    });

    const topRemaining = [
      ...remainingCategories.entries(),
    ].sort((a, b) => b[1] - a[1])[0];

    const topCategory = categoryRows[0];
    const topMovement = movements[0];

    const insights = [];

    if (topCategory && spentPaisa > 0) {
      insights.push(
        `${topCategory.name} is your largest category at ${money(
          topCategory.value
        )}, around ${Math.round(
          (topCategory.value / spentPaisa) * 100
        )}% of spending.`
      );
    }

    if (topMovement) {
      insights.push(
        `${topMovement.name} is ${money(
          Math.abs(topMovement.delta)
        )} ${topMovement.delta >= 0
          ? "higher"
          : "lower"
        } than this point last month.`
      );
    }

    if (topRemaining) {
      insights.push(
        `Based on last month, ${topRemaining[0]} may add another ${money(
          topRemaining[1]
        )} before month end.`
      );
    }

    return {
      current,
      spentPaisa,
      spentCapPaisa: Math.min(
        spentPaisa,
        salaryPaisa
      ),
      remainingPaisa,
      previousToDatePaisa,
      forecastRemainingPaisa,
      projectedPaisa,
      surplusPaisa,
      changePercent,
      categoryRows,
      insights,

      largest: [...current]
        .sort(
          (a, b) =>
            b.amountPaisa - a.amountPaisa
        )
        .slice(0, 5),
    };
  }, [caseData, expenses, salaryPaisa]);

  const pocketMetrics = useMemo(() => {
    if (!caseData || !metrics) {
      return [];
    }

    const available = Math.max(
      0,
      metrics.surplusPaisa
    );

    const planned = sum(
      pockets,
      (pocket) => pocket.contributionPaisa
    );

    const ratio =
      planned > 0 && planned > available
        ? available / planned
        : 1;

    return pockets.map((pocket) => {
      const affordablePaisa = Math.max(
        0,
        Math.round(
          pocket.contributionPaisa * ratio
        )
      );

      return {
        ...pocket,
        affordablePaisa,

        ...calculatePocket(
          pocket,
          affordablePaisa,
          caseData.today,
          Number(
            caseData.dps_annual_rate_percent
          )
        ),
      };
    });
  }, [caseData, metrics, pockets]);

  if (!caseData || !metrics) {
    return (
      <div className="loading">
        Loading your month…
      </div>
    );
  }

  if (!profile) {
    return (
      <WelcomeScreen
        defaultSalary={salaryPaisa / 100}
        onSubmit={({ name, salary }) => {
          const nextSalary = toPaisa(salary);

          if (!name || !nextSalary) return;

          setSalaryPaisa(nextSalary);
          setProfile({
            name,
            salaryPaisa: nextSalary,
          });
        }}
      />
    );
  }

  const filteredExpenses = metrics.current
    .filter((expense) =>
      `${expense.date} ${expense.shop} ${expense.category}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (spendingSort === "least") {
        return a.amountPaisa - b.amountPaisa;
      }

      if (spendingSort === "most") {
        return b.amountPaisa - a.amountPaisa;
      }

      const dateOrder =
        spendingSort === "oldest"
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);

      if (dateOrder) return dateOrder;

      return spendingSort === "oldest"
        ? (a.order || 0) - (b.order || 0)
        : (b.order || 0) - (a.order || 0);
    });

  function navigate(next) {
    setPage(next);
    setModal(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function logout() {
    window.localStorage.removeItem(
      "takaflow-profile"
    );
    setProfile(null);
    setPage("home");
    setModal(null);
  }

  function budgetRoom() {
    if (!caseData) return 0;

    const spent = sum(
      expenses.filter((expense) =>
        expense.date.startsWith(
          caseData.months.this
        )
      )
    );

    return Math.max(0, salaryPaisa - spent);
  }

  function saveThisMonth(goalId, amountPaisa) {
    const pocket = pockets.find(
      (item) => item.id === goalId
    );

    if (!pocket) return;

    const rawPaisa = amountPaisa;
    const cappedPaisa = Math.min(
      rawPaisa,
      budgetRoom()
    );

    if (!cappedPaisa) {
      if (rawPaisa > 0) {
        setToast(
          "No budget left to save this month."
        );
      }

      return;
    }

    setExpenses((current) => [
      ...current,
      {
        id: `S-${Date.now()}`,
        date: caseData.today,
        category: "Savings",
        shop: pocket.name,
        amountPaisa: cappedPaisa,
        amount_bdt: (
          cappedPaisa / 100
        ).toFixed(2),
        source: "savings",
        order: orderRef.current++,
      },
    ]);

    setPockets((current) =>
      current.map((item) =>
        item.id === goalId
          ? {
            ...item,
            savedPaisa:
              item.savedPaisa + cappedPaisa,
          }
          : item
      )
    );

    setToast(
      `Saved ${money(
        cappedPaisa
      )} to ${pocket.name}.`
    );
  }

  function openReceipt() {
    setReceiptFile(null);
    setReceiptPreview("");
    setReceiptStatus("idle");

    setReceiptDraft({
      shop: "",
      date: caseData.today,
      category: "Groceries",
      amount: "",
      amountCandidate: "1186.00",
    });

    setModal("receipt");
  }

  function selectReceipt(file) {
    if (!file) return;

    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(file);

    setReceiptPreview(
      URL.createObjectURL(file)
    );

    setReceiptStatus("reading");

    window.setTimeout(() => {
      setReceiptDraft({
        shop: "Shwapno",
        date: caseData.today,
        category: "Groceries",
        amount: "",
        amountCandidate: "1186.00",
      });

      setReceiptStatus("review");
    }, 1100);
  }

  function saveReceipt(event) {
    event.preventDefault();

    const rawPaisa = toPaisa(
      receiptDraft.amount
    );
    const amountPaisa = Math.min(
      rawPaisa,
      budgetRoom()
    );

    if (
      !amountPaisa ||
      !receiptDraft.shop ||
      !receiptDraft.date
    ) {
      if (rawPaisa > 0) {
        setToast(
          "That's beyond this month's budget."
        );
      }

      return;
    }

    setExpenses((current) => [
      ...current,
      {
        id: `R-${Date.now()}`,
        date: receiptDraft.date,
        category: receiptDraft.category,
        shop: receiptDraft.shop,
        amountPaisa,
        amount_bdt: (
          amountPaisa / 100
        ).toFixed(2),
        source: "receipt",
        order: orderRef.current++,
      },
    ]);

    setModal(null);
    setPage("spending");

    setToast(
      `Receipt saved. ${money(
        amountPaisa
      )} added.`
    );
  }

  function saveManualExpense(event) {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    const rawPaisa = toPaisa(
      form.get("amount")
    );
    const amountPaisa = Math.min(
      rawPaisa,
      budgetRoom()
    );

    if (!amountPaisa) {
      if (rawPaisa > 0) {
        setToast(
          "That's beyond this month's budget."
        );
      }

      return;
    }

    setExpenses((current) => [
      ...current,
      {
        id: `M-${Date.now()}`,
        date: String(form.get("date")),
        category: String(
          form.get("category")
        ),
        shop: String(form.get("shop")),
        amountPaisa,
        amount_bdt: (
          amountPaisa / 100
        ).toFixed(2),
        source: "manual",
        order: orderRef.current++,
      },
    ]);

    setModal(null);

    setToast(
      "Expense added. Forecast updated."
    );
  }

  function understandChatExpense(event) {
    event.preventDefault();

    const text = chatText.trim();

    if (!text) return;

    setChatStatus("thinking");

    try {
      const amountMatch = text.match(
        /(?:৳|tk\.?|taka)?\s*(\d+(?:\.\d{1,2})?)/i
      );

      if (!amountMatch) {
        setChatStatus("error");
        return;
      }

      const amount = amountMatch[1];
      const lower = text.toLowerCase();

      let category = "Groceries";

      if (
        /lunch|dinner|breakfast|food|restaurant|burger|pizza|coffee|cafe|madchef|kfc/.test(
          lower
        )
      ) {
        category = "Food";
      } else if (
        /uber|pathao|bus|rickshaw|cng|transport|ride/.test(
          lower
        )
      ) {
        category = "Transport";
      } else if (
        /electricity|desco|water|gas|utility/.test(
          lower
        )
      ) {
        category = "Utilities";
      } else if (
        /mobile|recharge|robi|grameenphone|airtel/.test(
          lower
        )
      ) {
        category = "Mobile";
      } else if (
        /movie|cinema|netflix|game/.test(
          lower
        )
      ) {
        category = "Entertainment";
      } else if (
        /doctor|medicine|pharmacy/.test(
          lower
        )
      ) {
        category = "Health";
      } else if (
        /book|course|tuition/.test(
          lower
        )
      ) {
        category = "Education";
      } else if (
        /shirt|clothes|dress/.test(
          lower
        )
      ) {
        category = "Clothing";
      } else if (/rent/.test(lower)) {
        category = "Rent";
      }

      const merchantMatch = text.match(
        /\b(?:at|from)\s+([a-zA-Z][a-zA-Z0-9 &'’-]*)/i
      );

      let shop =
        merchantMatch?.[1]?.trim() ||
        "Quick expense";

      shop = shop
        .replace(
          /\s+(today|yesterday|for lunch|for dinner|for breakfast)$/i,
          ""
        )
        .trim();

      let date = caseData.today;

      if (/yesterday/i.test(text)) {
        const yesterday = new Date(
          `${caseData.today}T12:00:00`
        );

        yesterday.setDate(
          yesterday.getDate() - 1
        );

        date = [
          yesterday.getFullYear(),
          String(
            yesterday.getMonth() + 1
          ).padStart(2, "0"),
          String(
            yesterday.getDate()
          ).padStart(2, "0"),
        ].join("-");
      }

      setChatDraft({
        shop,
        amount,
        category,
        date,
        originalText: text,
      });

      setChatStatus("review");
    } catch (error) {
      console.error(error);
      setChatStatus("error");
    }
  }

  function saveChatExpense() {
    if (!chatDraft) return;

    const rawPaisa = toPaisa(
      chatDraft.amount
    );
    const amountPaisa = Math.min(
      rawPaisa,
      budgetRoom()
    );

    if (
      !amountPaisa ||
      !chatDraft.shop ||
      !chatDraft.date
    ) {
      if (rawPaisa > 0) {
        setToast(
          "That's beyond this month's budget."
        );
      }

      return;
    }

    setExpenses((current) => [
      ...current,
      {
        id: `AI-${Date.now()}`,
        date: chatDraft.date,
        category: chatDraft.category,
        shop: chatDraft.shop,
        amountPaisa,
        amount_bdt: (
          amountPaisa / 100
        ).toFixed(2),
        source: "ai",
        order: orderRef.current++,
      },
    ]);

    setToast(
      `${money(
        amountPaisa
      )} added. Forecast and goals updated.`
    );

    setChatText("");
    setChatDraft(null);
    setChatStatus("idle");
  }

  function saveSalary(event) {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    const nextSalary = toPaisa(
      form.get("salary")
    );

    if (!nextSalary) return;

    setSalaryPaisa(nextSalary);
    setModal(null);

    setToast(
      "Monthly salary updated."
    );
  }

  function saveSalaryAmount(paisa) {
    setSalaryPaisa(paisa);

    setToast(
      "Monthly salary updated."
    );
  }

  function savePocket(event) {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    setPockets((current) => [
      ...current,
      {
        id: `SP-${Date.now()}`,
        name: String(form.get("name")),
        item: String(form.get("item")),

        targetPaisa: toPaisa(
          form.get("target")
        ),

        contributionPaisa: toPaisa(
          form.get("contribution")
        ),

        savedPaisa: 0,
      },
    ]);

    setModal(null);

    setToast("Goal created.");
  }

  const navigation = [
    {
      id: "home",
      label: "Home",
      icon: Home,
    },
    {
      id: "spending",
      label: "Spending",
      icon: List,
    },
    {
      id: "goals",
      label: "Goals",
      icon: Target,
    },
    {
      id: "month",
      label: "Your Month",
      icon: Wallet,
    },
  ];

  return (
    <div className="app">
      <header className="site-header">
        <button
          className="wordmark"
          onClick={() => navigate("home")}
        >
          TakaFlow
        </button>

        <nav className="navigation">
          {navigation.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                key={id}
                className={
                  page === id
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() =>
                  navigate(id)
                }
              >
                <Icon size={16} />
                {label}
              </button>
            )
          )}
        </nav>

        <span className="header-date">
          {caseData.today}
        </span>

        <button
          type="button"
          className="logout-button"
          onClick={logout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={16} />
          Log out
        </button>
      </header>

      <main className="content">
        {page === "home" && (
          <HomePage
            metrics={metrics}
            salaryPaisa={salaryPaisa}
            pockets={pocketMetrics}
            onSpending={() =>
              navigate("spending")
            }
            onGoals={() =>
              navigate("goals")
            }
            onSaveSalary={
              saveSalaryAmount
            }
          />
        )}

        {page === "spending" && (
          <SpendingPage
            expenses={filteredExpenses}
            search={search}
            setSearch={setSearch}
            sort={spendingSort}
            setSort={setSpendingSort}
            salaryPaisa={salaryPaisa}
            onReceipt={openReceipt}
            chatText={chatText}
            setChatText={setChatText}
            chatStatus={chatStatus}
            chatDraft={chatDraft}
            setChatDraft={setChatDraft}
            onChatSubmit={
              understandChatExpense
            }
            onChatSave={saveChatExpense}
          />
        )}

        {page === "goals" && (
          <GoalsPage
            caseData={caseData}
            metrics={metrics}
            pockets={pocketMetrics}
            setPockets={setPockets}
            onNew={() =>
              setModal("pocket")
            }
            onSaveSavings={
              saveThisMonth
            }
          />
        )}

        {page === "month" && (
          <MonthPage
            caseData={caseData}
            metrics={metrics}
            salaryPaisa={salaryPaisa}
            onEditSalary={() =>
              setModal("salary")
            }
          />
        )}
      </main>

      {modal === "receipt" && (
        <ReceiptModal
          preview={receiptPreview}
          file={receiptFile}
          status={receiptStatus}
          draft={receiptDraft}
          setDraft={setReceiptDraft}
          onSelect={selectReceipt}
          onSave={saveReceipt}
          onClose={() =>
            setModal(null)
          }
        />
      )}

      {modal === "manual" && (
        <Modal
          title="Add expense"
          onClose={() =>
            setModal(null)
          }
        >
          <ExpenseForm
            today={caseData.today}
            onSubmit={
              saveManualExpense
            }
          />
        </Modal>
      )}

      {modal === "salary" && (
        <Modal
          title="Monthly salary"
          onClose={() =>
            setModal(null)
          }
        >
          <form
            className="form-stack"
            onSubmit={saveSalary}
          >
            <label>
              Salary in BDT

              <input
                name="salary"
                type="number"
                min="1"
                step="0.01"
                defaultValue={
                  salaryPaisa / 100
                }
                autoFocus
              />
            </label>

            <button className="button primary">
              Save salary
            </button>
          </form>
        </Modal>
      )}

      {modal === "pocket" && (
        <Modal
          title="New savings goal"
          onClose={() =>
            setModal(null)
          }
        >
          <form
            className="form-stack"
            onSubmit={savePocket}
          >
            <label>
              Goal name

              <input
                name="name"
                required
                placeholder="Laptop"
              />
            </label>

            <label>
              What are you saving for?

              <input
                name="item"
                required
                placeholder="MacBook Air"
              />
            </label>

            <label>
              Target amount

              <input
                name="target"
                type="number"
                min="1"
                required
              />
            </label>

            <label>
              Monthly contribution

              <input
                name="contribution"
                type="number"
                min="1"
                required
              />
            </label>

            <button className="button primary">
              Create goal
            </button>
          </form>
        </Modal>
      )}

      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function HomePage({
  metrics,
  salaryPaisa,
  pockets,
  onSpending,
  onGoals,
  onSaveSalary,
}) {
  const chartData =
    metrics.categoryRows.slice(0, 6);

  const [salaryDraft, setSalaryDraft] =
    useState(null);

  function commitSalary(event) {
    event.preventDefault();

    const next = toPaisa(
      salaryDraft ?? ""
    );

    if (next > 0) {
      onSaveSalary(next);
    }

    setSalaryDraft(null);
  }

  return (
    <div className="home">
      <section className="money-now">
        <div className="salary-hero editable-money">
          <span>Salary 🪙</span>

          {salaryDraft === null ? (
            <strong>{money(salaryPaisa)}</strong>
          ) : (
            <form
              className="inline-salary"
              onSubmit={commitSalary}
            >
              <input
                type="number"
                min="1"
                step="0.01"
                autoFocus
                defaultValue={salaryPaisa / 100}
                onChange={(event) =>
                  setSalaryDraft(event.target.value)
                }
                onBlur={commitSalary}
                aria-label="Salary in BDT"
              />

              <button
                type="submit"
                className="save-chip"
              >
                Save
              </button>
            </form>
          )}

          <button
            type="button"
            className="edit-money-button"
            onClick={() =>
              salaryDraft === null
                ? setSalaryDraft(salaryPaisa / 100)
                : setSalaryDraft(null)
            }
          >
            {salaryDraft === null
              ? "Edit salary"
              : "Cancel"}
          </button>
        </div>

        <div className="money-flow money-flow-two">

          <div>
            <span>Spent</span>

            <strong>
              {money(
                metrics.spentCapPaisa
              )}
            </strong>
          </div>

          <div>
            <span>Remaining</span>

            <strong>
              {money(
                metrics.remainingPaisa
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-header">
          <div>
            <p className="kicker">
              Spending
            </p>

            <h2>
              Where your money is
              going
            </h2>
          </div>

          <button
            className="text-link"
            onClick={onSpending}
          >
            View spending
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="spending-overview">
          <div className="simple-chart">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={54}
                  outerRadius={82}
                  strokeWidth={0}
                >
                  {chartData.map(
                    (item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    money(value)
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="chart-center">
              <strong>
                {money(
                  metrics.spentCapPaisa
                )}
              </strong>

              <span>spent</span>
            </div>
          </div>

          <div className="category-list">
            {capToBudget(
              chartData,
              salaryPaisa
            ).map((item) => (
              <div key={item.name}>
                <span>
                  <i
                    style={{
                      background:
                        item.color,
                    }}
                  />

                  {item.name}
                </span>

                <strong>
                  {money(item.displayPaisa)}
                </strong>
              </div>
            ))}
          </div>

          <div className="largest-expenses">
            <p className="small-heading">
              Largest expenses
            </p>

            {capToBudget(
              metrics.largest
                .slice(0, 4),
              salaryPaisa
            ).map((expense) => (
                <div
                  className="expense-line"
                  key={expense.id}
                >
                  <span>
                    <strong>
                      {expense.shop}
                    </strong>

                    <small>
                      {
                        expense.category
                      }
                    </small>
                  </span>

                  <strong>
                    {money(
                      expense.displayPaisa
                    )}
                  </strong>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="home-section intelligence">
        <div className="section-header">
          <div>
            <p className="kicker">
              Intelligence
            </p>

            <h2>
              What your numbers are
              saying
            </h2>
          </div>
        </div>

        <div className="insight-layout">
          <div className="insight-list">
            {metrics.insights.map(
              (insight, index) => (
                <div
                  className="insight-row"
                  key={insight}
                >
                  <span>
                    0{index + 1}
                  </span>

                  <p>{insight}</p>
                </div>
              )
            )}
          </div>

          <div className="goal-impact">
            <span>
              Available for goals
            </span>

            <strong>
              {money(
                Math.max(
                  0,
                  metrics.surplusPaisa
                )
              )}
            </strong>

            {pockets[0] && (
              <p>
                At your current
                forecast,{" "}
                <b>
                  {pockets[0].name}
                </b>{" "}
                is expected around{" "}
                <b>
                  {
                    pockets[0]
                      .completion
                  }
                </b>
                .
              </p>
            )}

            <button
              className="text-link"
              onClick={onGoals}
            >
              Review goals
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SpendingPage({
  expenses,
  search,
  setSearch,
  sort,
  setSort,
  salaryPaisa,
  onReceipt,
  chatText,
  setChatText,
  chatStatus,
  chatDraft,
  setChatDraft,
  onChatSubmit,
  onChatSave,
}) {
  return (
    <div className="page">
      <section className="entry-and-receipt">
      <div className="expense-assistant">
        <div>
          <h2>
            Add a spending
          </h2>
        </div>

        <form
          className="chat-entry"
          onSubmit={onChatSubmit}
        >
          <textarea
            value={chatText}
            onChange={(event) =>
              setChatText(
                event.target.value
              )
            }
            placeholder="For example: Spent ৳450 at Madchef for lunch today"
          />

          <button
            className="button primary"
            disabled={
              !chatText.trim() ||
              chatStatus === "thinking"
            }
          >
            <Sparkles size={16} />

            {chatStatus ===
              "thinking"
              ? "Understanding…"
              : "Review expense"}
          </button>
        </form>

        {chatStatus === "error" && (
          <div className="inline-warning">
            <CircleAlert size={16} />
            Add an amount, for example
            “Spent 450 at Madchef”.
          </div>
        )}

        {chatStatus === "review" &&
          chatDraft && (
            <div className="expense-review">
              <div className="review-heading">
                <strong>
                  Review before saving
                </strong>

                <span>
                  Nothing is saved yet.
                </span>
              </div>

              <div className="review-grid">
                <label>
                  Shop

                  <input
                    value={
                      chatDraft.shop
                    }
                    onChange={(event) =>
                      setChatDraft({
                        ...chatDraft,
                        shop:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Amount

                  <input
                    value={
                      chatDraft.amount
                    }
                    type="number"
                    min="0.01"
                    step="0.01"
                    onChange={(event) =>
                      setChatDraft({
                        ...chatDraft,
                        amount:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Date

                  <input
                    type="date"
                    value={
                      chatDraft.date
                    }
                    onChange={(event) =>
                      setChatDraft({
                        ...chatDraft,
                        date:
                          event.target
                            .value,
                      })
                    }
                  />
                </label>

                <label>
                  Category

                  <select
                    value={
                      chatDraft.category
                    }
                    onChange={(event) =>
                      setChatDraft({
                        ...chatDraft,
                        category:
                          event.target
                            .value,
                      })
                    }
                  >
                    {CATEGORIES.map(
                      (category) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>

              <button
                className="button primary"
                onClick={onChatSave}
                type="button"
              >
                Confirm & save
              </button>
            </div>
          )}

      </div>

        <button
          className="receipt-action receipt-box"
          onClick={onReceipt}
          type="button"
        >
          <Camera size={22} />

          <span>
            <strong>Upload receipt</strong>

            <small>
              Photo or screenshot. Review every field before saving.
            </small>
          </span>

          <ChevronRight size={18} />
        </button>
      </section>

      <section className="transactions">
        <div className="transaction-heading">
          <h1>Your spending</h1>

          <div className="transaction-controls">
            <label className="search">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, category or date"
              />
            </label>

            <label className="sort-select">
              Sort
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value)
                }
              >
                <option value="recent">Recently added</option>
                <option value="oldest">Oldest first</option>
                <option value="least">Least amount</option>
                <option value="most">Most amount</option>
              </select>
            </label>
          </div>
        </div>

        <div className="transaction-list">
          <div className="transaction-column-head">
            <span>Date</span>
            <span>Spent on</span>
            <span>Amount</span>
          </div>

          {expenses.length === 0 ? (
            <p className="muted">
              No transactions found.
            </p>
          ) : (
            capToBudget(expenses, salaryPaisa).map((expense) => (
              <div
                className="transaction-row"
                key={expense.id}
              >
                <span className="date-cell">
                  {new Intl.DateTimeFormat("en", {
                    day: "2-digit",
                    month: "short",
                  }).format(
                    new Date(`${expense.date}T12:00:00`)
                  )}
                </span>

                <span className="transaction-name">
                  <strong>
                    {expense.shop}
                  </strong>

                  <small>
                    {expense.category} ·{" "}
                    {expense.source ===
                      "receipt"
                      ? "Receipt"
                      : expense.source ===
                        "ai"
                        ? "AI entry"
                        : "Manual"}
                  </small>
                </span>

                <strong>
                  {money(
                    expense.displayPaisa
                  )}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function GoalsPage({
  caseData,
  metrics,
  pockets,
  setPockets,
  onNew,
  onSaveSavings,
}) {
  const [openId, setOpenId] = useState(null);
  const [saveGoalId, setSaveGoalId] = useState(
    pockets[0]?.id || ""
  );
  const [saveAmount, setSaveAmount] = useState(
    pockets[0]
      ? String(pockets[0].contributionPaisa / 100)
      : ""
  );
  const [savedFlag, setSavedFlag] =
    useState(false);

  useEffect(() => {
    const newest =
      pockets[pockets.length - 1];

    if (newest) {
      setSaveGoalId(newest.id);
      setSaveAmount(
        String(
          newest.contributionPaisa / 100
        )
      );
      setSavedFlag(false);
    }
  }, [pockets.length]);

  function pickGoal(id) {
    setSaveGoalId(id);
    const pocket = pockets.find(
      (item) => item.id === id
    );
    setSaveAmount(
      pocket
        ? String(pocket.contributionPaisa / 100)
        : ""
    );
  }

  function submitSave(event) {
    event.preventDefault();

    const paisa = toPaisa(saveAmount);

    if (!saveGoalId || paisa <= 0) return;

    onSaveSavings(saveGoalId, paisa);
    setSavedFlag(true);

    window.setTimeout(
      () => setSavedFlag(false),
      2000
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <h1>Goals</h1>
      </div>

      <div className="goal-capacity goal-capacity-compact">
        <span>Available for goals this month</span>
        <strong>{money(Math.max(0, metrics.surplusPaisa))}</strong>
      </div>

      <div className="goal-add-wrap">
        <button className="folder-action" onClick={onNew}>
          <Plus size={18} />
          Add goal
        </button>
      </div>

      <section className="goal-list">
        {pockets.map((pocket) => {
          const progress = pocket.targetPaisa
            ? Math.min(
                100,
                (pocket.savedPaisa /
                  pocket.targetPaisa) *
                100
              )
            : 0;

          const open = openId === pocket.id;

          return (
            <div
              className={`goal-note${open ? " open" : ""}`}
              key={pocket.id}
            >
              <button
                type="button"
                className="goal-note-head"
                onClick={() =>
                  setOpenId(
                    open ? null : pocket.id
                  )
                }
                aria-expanded={open}
              >
                {pocket.name}
              </button>

              {open && (
                <div className="goal-details">
                  <div className="goal-main">
                    <span className="goal-item">{pocket.item}</span>

                    <div className="goal-date">
                      <span>Forecast</span>
                      <strong>{pocket.completion}</strong>
                    </div>
                  </div>

                  <div className="progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  <div className="goal-numbers">
                    <div>
                      <span>Saved</span>
                      <strong>{money(pocket.savedPaisa)}</strong>
                    </div>

                    <div>
                      <span>Target</span>
                      <strong>{money(pocket.targetPaisa)}</strong>
                    </div>

                    <label>
                      Monthly plan
                      <input
                        type="number"
                        min="1"
                        value={pocket.contributionPaisa / 100}
                        onChange={(event) =>
                          setPockets((current) =>
                            current.map((item) =>
                              item.id === pocket.id
                                ? {
                                  ...item,
                                  contributionPaisa: toPaisa(event.target.value),
                                }
                                : item
                            )
                          )
                        }
                      />
                    </label>

                    <div>
                      <span>Affordable</span>
                      <strong>{money(pocket.affordablePaisa)}</strong>
                    </div>
                  </div>

                  <details className="dps">
                    <summary>
                      DPS projection at {caseData.dps_annual_rate_percent}% p.a.
                    </summary>

                    <div>
                      <span>Deposits <strong>{money(pocket.dps.depositsPaisa)}</strong></span>
                      <span>Interest <strong>{money(pocket.dps.interestPaisa, true)}</strong></span>
                      <span>Projected value <strong>{money(pocket.dps.balancePaisa, true)}</strong></span>
                    </div>

                    <p>Monthly contribution is deposited first, then monthly interest is applied.</p>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="goal-save">
        <div className="goal-save-head">
          <h2>Save this month 🪙</h2>
          <span>tuck a little away before you spend it.</span>
        </div>

        <form
          className="goal-save-form"
          onSubmit={submitSave}
        >
          <label>
            Name of goal
            <select
              value={saveGoalId}
              onChange={(event) =>
                pickGoal(event.target.value)
              }
            >
              {pockets.map((pocket) => (
                <option
                  key={pocket.id}
                  value={pocket.id}
                >
                  {pocket.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Allocated savings
            <input
              type="number"
              min="1"
              step="0.01"
              value={saveAmount}
              onChange={(event) =>
                setSaveAmount(
                  event.target.value
                )
              }
              placeholder="500"
            />
          </label>

          <button
            type="submit"
            className="button primary"
          >
            Save
          </button>
        </form>

        {savedFlag && (
          <p className="goal-save-saved">
            <Check size={15} />
            Saved! ✨
          </p>
        )}
      </section>
    </div>
  );
}

function MonthPage({
  caseData,
  metrics,
  salaryPaisa,
  onEditSalary,
}) {
  const [calendarOpen, setCalendarOpen] =
    useState(false);

  const [year, month] = caseData.months.this
    .split("-")
    .map(Number);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const spendingByDate = metrics.current.reduce(
    (totals, expense) => ({
      ...totals,
      [expense.date]:
        (totals[expense.date] || 0) +
        expense.amountPaisa,
    }),
    {}
  );

  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => index + 1
    ),
  ];

  return (
    <div className="page month-page">
      <div className="page-heading">
        <div>
          <p className="kicker">
            Your Month
          </p>

          <h1>
            {monthName(
              caseData.months.this
            )}
          </h1>
        </div>

        <button
          className="button secondary"
          onClick={() => setCalendarOpen((open) => !open)}
        >
          {calendarOpen
            ? "Close calendar"
            : "Open full calendar"}
        </button>
      </div>

      <div className="month-numbers">
        <div>
          <span>Salary</span>

          <strong>
            {money(salaryPaisa)}
          </strong>
        </div>

        <div>
          <span>Spent</span>

          <strong>
            {money(
              metrics.spentCapPaisa
            )}
          </strong>
        </div>

        <div>
          <span>
            Projected spending
          </span>

          <strong>
            {money(
              metrics.projectedPaisa
            )}
          </strong>
        </div>

        <div>
          <span>Month-end</span>

          <strong
            className={
              metrics.surplusPaisa <
                0
                ? "negative"
                : ""
            }
          >
            {money(
              metrics.surplusPaisa
            )}
          </strong>
        </div>
      </div>

      {calendarOpen && (
        <section className="calendar-panel">
          <div className="calendar-weekdays">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarCells.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} />;
              }

              const date = `${caseData.months.this}-${String(day).padStart(2, "0")}`;
              const spending = spendingByDate[date];

              return (
                <div
                  className={
                    spending
                      ? "calendar-day has-spending"
                      : "calendar-day"
                  }
                  key={date}
                >
                  <strong>{day}</strong>
                  {spending && <small>{money(spending)}</small>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="month-comparison">
        <p className="kicker">
          Compared with last month
        </p>

        <h2>
          {percent(
            metrics.changePercent
          )}{" "}
          {metrics.changePercent > 0
            ? "more spending"
            : "less spending"}
        </h2>

        <p>
          Through the same day, the
          difference is{" "}
          {money(
            Math.abs(
              metrics.spentPaisa -
              metrics.previousToDatePaisa
            )
          )}
          .
        </p>
      </section>

      <section className="month-category-list">
        <div className="section-header">
          <h2>By category</h2>
        </div>

        {metrics.categoryRows.map(
          (category) => (
            <div
              className="category-row"
              key={category.name}
            >
              <span>
                {category.name}
              </span>

              <strong>
                {money(
                  category.value
                )}
              </strong>
            </div>
          )
        )}
      </section>
    </div>
  );
}

function ReceiptModal({
  preview,
  file,
  status,
  draft,
  setDraft,
  onSelect,
  onSave,
  onClose,
}) {
  const canSave =
    status === "review" &&
    toPaisa(draft.amount) > 0 &&
    draft.shop &&
    draft.date;

  return (
    <div className="modal-backdrop">
      <div className="receipt-modal">
        <div className="modal-heading">
          <button
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <p className="kicker">
              Receipt review
            </p>

            <h2>
              Confirm what we found
            </h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="receipt-layout">
          <section>
            <label className="upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  onSelect(
                    event.target
                      .files?.[0]
                  )
                }
              />

              {preview ? (
                <img
                  src={preview}
                  alt="Receipt preview"
                />
              ) : (
                <>
                  <Upload size={24} />

                  <strong>
                    Upload receipt
                  </strong>

                  <span>
                    JPG, PNG, HEIC or
                    WebP
                  </span>
                </>
              )}
            </label>

            {file && (
              <small>{file.name}</small>
            )}
          </section>

          <form
            className="form-stack"
            onSubmit={onSave}
          >
            {status === "idle" && (
              <p className="muted">
                Upload a receipt to
                create a reviewable
                draft.
              </p>
            )}

            {status ===
              "reading" && (
                <p className="muted">
                  Reading receipt…
                </p>
              )}

            {status ===
              "review" && (
                <>
                  <label>
                    Shop

                    <input
                      value={
                        draft.shop
                      }
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          shop:
                            event.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Date

                    <input
                      type="date"
                      value={
                        draft.date
                      }
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          date:
                            event.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Amount

                    <input
                      value={
                        draft.amount
                      }
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Confirm amount"
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          amount:
                            event.target
                              .value,
                        })
                      }
                    />

                    {!draft.amount && (
                      <span className="field-warning">
                        Amount is uncertain.
                        Confirm it before
                        saving.{" "}

                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              amount:
                                draft.amountCandidate,
                            })
                          }
                        >
                          Use{" "}
                          {money(
                            toPaisa(
                              draft.amountCandidate
                            ),
                            true
                          )}
                        </button>
                      </span>
                    )}
                  </label>

                  <label>
                    Category

                    <select
                      value={
                        draft.category
                      }
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          category:
                            event.target
                              .value,
                        })
                      }
                    >
                      {CATEGORIES.map(
                        (category) => (
                          <option
                            key={
                              category
                            }
                            value={
                              category
                            }
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <button
                    className="button primary"
                    disabled={!canSave}
                  >
                    Confirm & add expense
                  </button>
                </>
              )}
          </form>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div className="modal-backdrop">
      <div className="simple-modal">
        <div className="modal-heading">
          <h2>{title}</h2>

          <button
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ExpenseForm({
  today,
  onSubmit,
}) {
  return (
    <form
      className="form-stack"
      onSubmit={onSubmit}
    >
      <label>
        Shop

        <input
          name="shop"
          required
          placeholder="Meena Bazar"
        />
      </label>

      <label>
        Date

        <input
          name="date"
          type="date"
          required
          defaultValue={today}
        />
      </label>

      <label>
        Category

        <select name="category">
          {CATEGORIES.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            )
          )}
        </select>
      </label>

      <label>
        Amount

        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>

      <button className="button primary">
        Add expense
      </button>
    </form>
  );
}
