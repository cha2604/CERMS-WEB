import { FiUsers, FiUser, FiShield, FiActivity, FiTruck } from "react-icons/fi";

const TEAM_ICONS: Record<string, React.ElementType> = {
  "Barangay Sanitary Inspection": FiShield,
  "Solid Waste Management": FiActivity,
  "Barangay Garbage Crew": FiTruck,
};

interface OrgPerson {
  name: string;
  position: string;
  team?: string;
}

interface OrgTeam {
  name: string;
  head: OrgPerson;
  members: OrgPerson[];
}

const BARANGAY_ORG: {
  head: OrgPerson;
  teams: OrgTeam[];
} = {
  head: {
    name: "Hon. Barangay Captain",
    position: "Barangay Captain / Head",
  },
  teams: [
    {
      name: "Barangay Sanitary Inspection",
      head: { name: "Jeanilie S. Javier", position: "Sanitary Inspector" },
      members: [],
    },
    {
      name: "Solid Waste Management",
      head: { name: "Dominador L. Domo", position: "SWM Coordinator" },
      members: [],
    },
    {
      name: "Barangay Garbage Crew",
      head: { name: "Richard E. Dela Cruz", position: "Garbage Crew Head (Driver)" },
      members: [
        { name: "Marlon Malilong", position: "Garbage Crew Member" },
        { name: "Rogelio Margallo", position: "Garbage Crew Member" },
      ],
    },
  ],
};

export default function OrgChart() {
  const iconColor = (teamName: string) => {
    switch (teamName) {
      case "Barangay Sanitary Inspection":
        return "text-blue-600";
      case "Solid Waste Management":
        return "text-emerald-600";
      case "Barangay Garbage Crew":
        return "text-orange-600";
      default:
        return "text-slate-600";
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Barangay Personnel Org Chart
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Assigned response teams and person-in-charge hierarchy.
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center gap-8">
          <div className="relative w-full max-w-md">
            <div className="relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full h-[2px] bg-slate-300" />
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-12 bg-slate-300"
              />
            </div>
            <div className="bg-emerald-800 text-white rounded-xl px-6 py-4 shadow-lg border border-emerald-700">
              <div className="flex items-center gap-3 mb-2">
                <FiUser size={20} className="text-emerald-300" />
                <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
                  Head of Office
                </span>
              </div>
              <p className="font-black text-lg">{BARANGAY_ORG.head.name}</p>
              <p className="text-xs text-emerald-200 mt-1 font-medium">
                {BARANGAY_ORG.head.position}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {BARANGAY_ORG.teams.map((team) => {
              const Icon = TEAM_ICONS[team.name] || FiUsers;
              return (
                <div
                  key={team.name}
                  className="relative w-full max-w-md flex flex-col items-center"
                >
                  <div className="relative">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full h-[2px] bg-slate-300" />
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-12 bg-slate-300"
                    />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-w-[200px]">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon size={20} className={iconColor(team.name)} />
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        {team.name}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="font-semibold text-slate-900">
                        {team.head.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {team.head.position}
                      </p>
                      <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        Team Head
                      </span>
                    </div>
                    {team.members.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {team.members.map((member) => (
                          <div
                            key={member.name}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100"
                          >
                            <FiUser size={14} className="text-blue-600" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {member.position}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {team.members.length > 0 && (
                    <div
                      className="absolute -left-1/2 top-[40px] w-[2px] h-6 bg-slate-300"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
