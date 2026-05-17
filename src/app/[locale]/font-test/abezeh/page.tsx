import { setRequestLocale } from "next-intl/server";
import { fontAbeZehEdu } from "@/app/fonts";

const silbenbogenFeatureStyle = {
  fontFeatureSettings: '"ss02" 1',
} as const;

const fontSamples = [
  {
    file: "ABeZehEDU-Thin.otf",
    label: "Thin",
    weight: 100,
  },
  {
    file: "ABeZehEDU-ExtraLight.otf",
    label: "ExtraLight",
    weight: 200,
  },
  {
    file: "ABeZehEDU-Light.otf",
    label: "Light",
    weight: 300,
  },
  {
    file: "ABeZehEDU-Regular.otf",
    label: "Regular",
    weight: 400,
  },
  {
    file: "ABeZehEDU-Medium.otf",
    label: "Medium",
    weight: 500,
  },
  {
    file: "ABeZehEDU-Bold.otf",
    label: "Bold",
    weight: 700,
  },
  {
    file: "ABeZehEDU-ExtraBold.otf",
    label: "ExtraBold",
    weight: 800,
  },
] as const;

const previewText = "Franz jagt im komplett verwahrlosten Taxi quer durch Zurich. 1234567890";

const silbenbogenExamples = [
  {
    label: "Kurzer Bogen, betont",
    input: "I0,5*bgel2,5*u",
  },
  {
    label: "Mehrere Silben",
    input: "E1*ble1,5*ufant3,5*u",
  },
  {
    label: "Gemischte Bogenlaengen",
    input: "Krab4*bbe2*u",
  },
  {
    label: "Mittlere Silbe, betont",
    input: "Ha2,5*bse2*u",
  },
  {
    label: "Lange Silbe",
    input: "Schwan7,5*b",
  },
  {
    label: "Langes Wort",
    input: "schnar6,5*bchen4*u",
  },
] as const;

const silbenbogenWidths = [
  "0,5", "1", "1,5", "2", "2,5", "3", "3,5", "4", "4,5", "5", "5,5", "6", "6,5", "7", "7,5", "8", "8,5", "9",
] as const;

export default async function ABeZehFontTestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10 text-stone-900 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-stone-300 bg-white px-8 py-7 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
            ABeZeh font test
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            public/fonts/ABeZeh preview
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-stone-600">
            This page loads the OTF files via next/font/local and renders each available weight.
            If a row falls back to a system sans serif, that weight did not load correctly.
          </p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
            Silbenboegen use Stylistic Set 2. The syntax from the PDF is
            <span className="mx-2 rounded bg-stone-100 px-2 py-1 font-mono text-sm text-stone-800">
              Silbe + Laenge + * + b/u
            </span>
            for example
            <span className="mx-2 rounded bg-stone-100 px-2 py-1 font-mono text-sm text-stone-800">
              Krab4*bbe2*u
            </span>
            or
            <span className="ml-2 rounded bg-stone-100 px-2 py-1 font-mono text-sm text-stone-800">
              Schwan7,5*b
            </span>
            .
          </p>
        </header>

        <section className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Silbenboegen feature
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Stylistic Set 2 comparison
            </h2>
            <p className="mt-2 max-w-4xl text-base leading-7 text-stone-600">
              The middle column shows the raw marker syntax without OpenType substitution.
              The right column enables <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">ss02</span>
              so the font can replace the markers with Silbenboegen.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm uppercase tracking-[0.16em] text-stone-500">
                  <th className="pr-6">Case</th>
                  <th className="pr-6">Raw input</th>
                  <th>Rendered with ss02</th>
                </tr>
              </thead>
              <tbody>
                {silbenbogenExamples.map((example) => (
                  <tr key={example.input} className="align-top">
                    <td className="pr-6 pt-4 text-sm font-semibold text-stone-700">
                      {example.label}
                    </td>
                    <td className="pr-6 pt-3">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-lg text-stone-800">
                        {example.input}
                      </div>
                    </td>
                    <td className="pt-3">
                      <div className={`${fontAbeZehEdu.className} rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-3xl leading-tight text-stone-900`} style={silbenbogenFeatureStyle}>
                        {example.input}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Width tokens
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              All documented length steps
            </h2>
            <p className="mt-2 text-base leading-7 text-stone-600">
              The PDF describes 18 width levels from 0,5 to 9 and two strengths:
              <span className="mx-2 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">b</span>
              for betont and
              <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800">u</span>
              for unbetont.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {silbenbogenWidths.map((width) => (
              <div key={width} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Ca. {width} letters
                </p>
                <div className="mt-3 flex flex-wrap gap-2 font-mono text-sm text-stone-800">
                  <span className="rounded bg-white px-2 py-1">{width}*b</span>
                  <span className="rounded bg-white px-2 py-1">{width}*u</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          {fontSamples.map((sample) => (
            <article
              key={sample.file}
              className="rounded-3xl border border-stone-300 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {sample.label}
                  </p>
                  <h2 className="text-2xl font-semibold">Weight {sample.weight}</h2>
                </div>
                <code className="text-sm text-stone-500">{sample.file}</code>
              </div>

              <div className={fontAbeZehEdu.className}>
                <p
                  className="mt-5 text-4xl leading-tight sm:text-5xl"
                  style={{ fontWeight: sample.weight }}
                >
                  {previewText}
                </p>
                <p
                  className="mt-4 text-xl leading-8 text-stone-700"
                  style={{ fontWeight: sample.weight }}
                >
                  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
                </p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}