
import { useMemo, useState } from "react";
import {
  FaBirthdayCake,
  FaChevronLeft,
  FaChevronRight,
  FaGift,
  FaCalendarAlt,
  FaHeart,
} from "react-icons/fa";

const birthdays = [
  { id: 1, name: "Silpi Gorai", date: "2004-07-05", image: "https://scontent.cdninstagram.com/v/t51.82787-19/559794783_18056363219534883_6073348615481467044_n.jpg?_nc_cat=103&ig_cache_key=GF-KXSEjxKKrKiZAAKQg4kZj3khUbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy44MTAuQzMifQ%3D%3D&_nc_ohc=c1pXZBuEq9cQ7kNvwGGpV40&_nc_oc=AdpLi4F6TLYZ9-P6s1Jeio3Tw6p9Ff4PjmhmI8Cm6c5C-G0tEdR69WndcqPRvUvzNOs&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=RM1tpXHse0DZKSdnAwvOsg&_nc_ss=7b6a8&oh=00_AQPSA728Ft5KFs-lstGtA6cWKp9AozgvIoZAMACcEcd_Pw&oe=6AE3A81C" },
  { id: 2, name: "Namrata Roychowdhury", date: "2005-02-20", image: "https://scontent.cdninstagram.com/v/t51.82787-19/860117213_18120111967977306_7266443015931197018_n.jpg?_nc_cat=100&ig_cache_key=GN1YRDNaPyRVJWBAAFp2Mnlsl9dkbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=mBv2wqVtCRsQ7kNvwGVUkd1&_nc_oc=AdpUWb64t5KQCHFun4z6vXUTpf7oTqgHxlZ64OMjnnfKaBhs4gfBYAjhL3tZ04WOiWA&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=kpcwEkvK3NqY1_KbuQmeKw&_nc_ss=7b6a8&oh=00_AQOjyrBEVJaUyiXSM90W3kKIqVZ0kKjg6W_finabNB0rVA&oe=6AE394F6" },
  { id: 3, name: "Koyel Sen", date: "2004-11-01", image: "https://scontent.cdninstagram.com/v/t51.82787-19/723675567_17999238443953133_1588983083638353163_n.jpg?_nc_cat=100&ig_cache_key=GK9pIivt661FNvI-AAttXh6yMw0WbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=Kv9_g_yW6q4Q7kNvwHOlKXt&_nc_oc=AdobETHaCSevDaIhCtWHeK5Y23MaQ_erWHERGjhbAzEnDyHynykdKk9iFQyvyyahqcY&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=3Hw-5381k7MdSY7leN4ENQ&_nc_ss=7b6a8&oh=00_AQM3aiTKgHbtGkyIw6g7pXF-fbqKYZJ7AhyuT4LjXIfpbA&oe=6AE3BFD5" },
  { id: 4, name: "Saptarathi Ghosh", date: "2005-10-19", image: "https://scontent.cdninstagram.com/v/t51.82787-19/617586504_18067365860556500_7165350199231133820_n.jpg?_nc_cat=102&ig_cache_key=GEifzyTUPiVsLDBAAHw4cuQKcHBjbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=CmqgZqooVtAQ7kNvwE7U03A&_nc_oc=AdqKOB7702Ra-qN6YGT0SFmumPYtW4ptMual7wBt3vb7uzCh0G7hJnseF45T3KyAjJ8&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=624R2lvFH3dnMROpHk811Q&_nc_ss=7b6a8&oh=00_AQPgAqteEVEuHWJPbPpkiRv16jg7YPknMdhHclSZNVaZMA&oe=6AE3B87C" },
  { id: 5, name: "Soumyadeep Pathak", date: "2004-10-07", image: "https://scontent.cdninstagram.com/v/t51.82787-19/610501602_18078388619461671_816282190394348568_n.jpg?_nc_cat=108&ig_cache_key=GOKDYyQnRMbbMjpAABjU7spTBFQLbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=SGR-JVP51CIQ7kNvwEbCcD1&_nc_oc=AdochZjeAkyio6Z3d-7vKpm2C1s759WIrgwYnaTQ9-N9obL1BzEOYM5FyVArkvbL62s&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=PqIu-qoo5IA_u6a4MZQ7pw&_nc_ss=7b6a8&oh=00_AQPm7pw_rKNMQekGboXxYGw37bTVoZi95T2e8G0OQZneRQ&oe=6AE38E01" },
  { id: 6, name: "Sayak Bhattacharya", date: "2004-10-25", image: "https://scontent.cdninstagram.com/v/t51.82787-19/610136011_18085548017514310_6171292253415613647_n.jpg?_nc_cat=104&ig_cache_key=GMvvXSRG9ybJtUBAAM8k9Ymb1aRVbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=efo1JOEI3sEQ7kNvwHWQfVV&_nc_oc=Adpkrzrj1mu_pA4VIrYrpqvqZM0mwjYtd8P6zU9FmHqtNzq1vmqDoKumqL-wTy63--8&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=yGRv1RtWoXUitiTYL-tO9Q&_nc_ss=7b6a8&oh=00_AQOpI_Ai-E2hmQQBzejgwAEMN28rWkvEG1gzGcptZ1qRfA&oe=6AE3AB04" },
  { id: 7, name: "Dipanwita Mondal", date: "2005-07-19", image: "https://scontent.cdninstagram.com/v/t51.82787-19/785146914_18113753044991676_1632822217291821553_n.jpg?_nc_cat=103&ig_cache_key=GCJkzC68vsvHXFpAAPFxC9Mn86gWbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=fPZkLdamLUIQ7kNvwGz-eiX&_nc_oc=Adqn0JA7XoSk2yLmnKFy3R20tuyn8mfbvqL51Be6JtHY5MAoRGGJJCIOa3C62GATEXI&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=zIHQnH5m0BIwhN7WPIpaPQ&_nc_ss=7b6a8&oh=00_AQMK9eJteUfTt186JVReg8UajRYlGs7jCkkvgda_jRMsXA&oe=6AE3B782" },
  { id: 8, name: "Kuahsik Ghosh", date: "2005-05-18", image: "" },
  { id: 9, name: "Kaushik Debnath", date: "2004-11-16", image: "https://scontent.cdninstagram.com/v/t51.82787-19/532660637_18023763467709170_2527722715180278027_n.jpg?_nc_cat=111&ig_cache_key=GJ3Bvx-yKgJzhAhAAAuhAcFqRhQjbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=Asx_dEakGWEQ7kNvwEDjQpb&_nc_oc=AdoFSnVvPQFbNnWYmNOqmL6Txcr8xPhjTT7Q4xR0BcGBLxVTdsfvUG9Z0MeqqKZH4ag&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=-sZGigzUFm6uWIuq64C9bA&_nc_ss=7b6a8&oh=00_AQNWn8Hi8QS31OgQntU6HRFWpm-Zk2Uz4XcqFXIEp5xWDg&oe=6AE3BC26" },
  { id: 10, name: "Angana Mukhopadhyay", date: "2004-11-24", image: "https://scontent.cdninstagram.com/v/t51.82787-19/669659883_18097900235476368_3623086478655968631_n.jpg?_nc_cat=105&ig_cache_key=GOsy6ieQTbfC8UtAAHdVz9b0yUcybmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=tTVpgawRYvkQ7kNvwGTzfZ2&_nc_oc=AdpCnosinvVGTfpbeOgWAedgdM-7nvpl5ob2aZjuHuoHWtzZN_eeQvILeGgasLVeDWo&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=Mp8AnZ_7xkHPsKja2UxBZQ&_nc_ss=7b6a8&oh=00_AQNAWE8oWN77M02KlIeYc39cnDlgJdNFniC84sEe12Zpkw&oe=6AE3BC96" },
  { id: 11, name: "Sayan Ghosh", date: "2004-12-17", image: "https://scontent.cdninstagram.com/v/t51.2885-19/299420124_5165745756884530_8744881424611810900_n.jpg?_nc_cat=110&ig_cache_key=GNzJ2BEyztboN1oSAFQe5sRSD1x5bkULAAAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy40NjguQzMifQ%3D%3D&_nc_ohc=6cOfrXQzhNoQ7kNvwEpni0y&_nc_oc=Ado4JjowL83IsbTX8gXvwwO7KGxmeKfN-6cwKwgo1yGqSdAH0vN37zz83375mSC48d4&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_ss=7b6a8&oh=00_AQMCI7foZboS88JGjcLX2k44utu5kyLqmcUImwGif0XPLQ&oe=6AE3B18D" },
  { id: 12, name: "Prativa Maiti", date: "2004-04-26", image: "https://scontent.cdninstagram.com/v/t51.82787-19/671174135_18106546009937176_5962490786271982425_n.jpg?_nc_cat=105&ig_cache_key=GPdNASgYFQjDzlNAAFnzR4zHBb9SbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=Yr2QROtOcoMQ7kNvwEOkcZM&_nc_oc=AdpHJcW5yFG_MMpP6I0Y68PSsHCgSp4wcoV8chACcXgBnzxvadaMx7nrY62eo9Z3p60&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=vNZUXb9tWwKEaPhyX58U6g&_nc_ss=7b6a8&oh=00_AQN3HWF1csxjefIX7Cz_bOWUoRwU9XkJu_GZAq5kGTUe9A&oe=6AE3C6D3" },
  { id: 13, name: "Sneha Guchait", date: "", image: "https://scontent.cdninstagram.com/v/t51.82787-19/809766874_18122228833922062_809604690782924203_n.jpg?_nc_cat=101&ig_cache_key=GNoPRDAOLC80EmJAAKstm0ItSzwLbmNDAQAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=dycpr_ycRxUQ7kNvwEen0F7&_nc_oc=AdrcD2tXhIT8wiolau_jZyHw2g41Ggy16j8ZsG03_mkUddDz3hpsGmPyzFATARiAnVo&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=Z2YXeGIeJ41_Myj7r8Kr-g&_nc_ss=7b6a8&oh=00_AQNletUiTVK3dTGkTbfpzh-2krYD2_T5jxG-FCgYa5eebA&oe=6AE3B19C" },
  { id: 14, name: "Debashruti Dian", date: "2004-03-30", image: "https://scontent.cdninstagram.com/v/t51.2885-19/466993900_418794391280914_4539186961798306346_n.jpg?_nc_cat=106&ig_cache_key=GOzC1RsSHe0q5HwBACqaEvt9bv4_bkULAAAB0j-ccb7-5&ccb=7-5&_nc_sid=669407&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=MTqLHgX7PhkQ7kNvwFrtxIM&_nc_oc=AdqwbYqW815BvghClUX7ZwifpMuSFvO-3YvUrDLS-MVH1XCHQtrHUvTPs_HrHKLAE7M&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_ss=7b6a8&oh=00_AQN3u6PYgHxEgLRrG3zSILs_CzIqcBNFUFfNPTbO3n6sxQ&oe=6AE3B047" },
];

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getBirthdayDate(date) {
  const [, month, day] = date.split("-").map(Number);
  return { month: month - 1, day };
}

export default function BirthdayCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const birthdayMap = useMemo(() => {
    const map = {};
    birthdays.forEach((person) => {
      const { month: birthMonth, day } = getBirthdayDate(person.date);
      if (birthMonth === month) {
        map[day] = [...(map[day] || []), person];
      }
    });
    return map;
  }, [month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const upcoming = useMemo(() => {
    return birthdays
      .map((person) => {
        const { month: birthMonth, day } = getBirthdayDate(person.date);
        let next = new Date(year, birthMonth, day);
        next.setHours(0, 0, 0, 0);

        if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          next = new Date(year + 1, birthMonth, day);
        }

        const daysLeft = Math.round(
          (next - new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
            86400000
        );

        return { ...person, next, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [year]);

  function changeMonth(amount) {
    setViewDate(new Date(year, month + amount, 1));
  }

  function formatDate(person) {
    const { month: birthMonth, day } = getBirthdayDate(person.date);
    return `${monthNames[birthMonth]} ${day}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <section className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-700">
            <FaHeart /> Celebrate Your People
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Birthday Calendar
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Every birthday is a new reason to celebrate friendship. Never miss
            a special day with your FriendsZone family.
          </p>
        </section>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
            <FaBirthdayCake className="text-2xl text-pink-500" />
            <p className="mt-3 text-sm text-slate-500">Listed birthdays</p>
            <p className="text-3xl font-bold text-slate-900">{birthdays.length}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <FaCalendarAlt className="text-2xl text-violet-500" />
            <p className="mt-3 text-sm text-slate-500">Selected month</p>
            <p className="text-xl font-bold text-slate-900">
              {monthNames[month]} {year}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <FaGift className="text-2xl text-amber-500" />
            <p className="mt-3 text-sm text-slate-500">Coming up next</p>
            <p className="text-xl font-bold text-slate-900">
              {upcoming[0]?.daysLeft === 0
                ? "Today! 🎉"
                : upcoming[0]
                ? `${upcoming[0].daysLeft} days`
                : "No birthdays"}
            </p>
          </div>
        </section>

        <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Calendar */}
          <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {monthNames[month]} {year}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Look out for a birthday to celebrate!
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:bg-violet-50"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:bg-violet-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2 text-xs font-bold text-slate-400 sm:text-sm">
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const people = birthdayMap[day] || [];
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();

                return (
                  <div
                    key={day}
                    title={people.map((person) => person.name).join(", ")}
                    className={`relative flex min-h-12 flex-col items-center rounded-xl border p-1 pt-2 sm:min-h-16 sm:pt-3 ${
                      people.length
                        ? "border-pink-200 bg-pink-50"
                        : "border-transparent"
                    } ${isToday ? "ring-2 ring-violet-500" : ""}`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isToday ? "text-violet-700" : "text-slate-700"
                      }`}
                    >
                      {day}
                    </span>
                    {people.length > 0 && (
                      <span className="mt-1 flex gap-0.5 text-[10px] text-pink-600">
                        <FaBirthdayCake />
                        <span>{people.length}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-3 w-3 rounded bg-pink-100 ring-1 ring-pink-200" />
              Birthday this day
              <span className="ml-auto h-3 w-3 rounded-full ring-2 ring-violet-500" />
              Today
            </div>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <h3 className="mb-3 font-bold text-slate-900">
                Birthdays in {monthNames[month]}
              </h3>
              {birthdays.filter((person) => {
                return getBirthdayDate(person.date).month === month;
              }).length === 0 ? (
                <p className="text-sm text-slate-500">
                  No birthdays listed for this month yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {birthdays
                    .filter((person) => getBirthdayDate(person.date).month === month)
                    .sort((a, b) => getBirthdayDate(a.date).day - getBirthdayDate(b.date).day)
                    .map((person) => (
                      <div key={person.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                        <img
                          src={person.image}
                          alt={person.name}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">{person.name}</p>
                          <p className="text-sm text-slate-500">{formatDate(person)}</p>
                        </div>
                        <FaBirthdayCake className="text-pink-400" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>

          {/* Upcoming birthdays */}
          <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Coming Up 🎂
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Make their day a little more special.
              </p>
            </div>

            <div className="space-y-4">
              {upcoming.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-pink-200 hover:bg-pink-50/50"
                >
                  <img
                    src={person.image}
                    alt={person.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">
                      {person.name}
                    </p>
                    <p className="text-sm text-slate-500">{formatDate(person)}</p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                    {person.daysLeft === 0
                      ? "Today!"
                      : person.daysLeft === 1
                      ? "Tomorrow"
                      : `${person.daysLeft} days`}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 p-5 text-white">
              <FaGift className="text-3xl" />
              <h3 className="mt-3 text-lg font-bold">Make a memory!</h3>
              <p className="mt-2 text-sm leading-6 text-white/90">
                A little wish can make someone's birthday unforgettable.
                Remember to send your friends some love.
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Birthday information should only be shared with members' permission.
        </p>
      </div>
    </main>
  );
}
