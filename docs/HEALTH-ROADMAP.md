# Health system roadmap

The health system (`src/modules/health/`) already models conditions that start, progress, get diagnosed and treated, insurance and national systems with waiting lists, medical debt and bankruptcy, mental health care (therapy and medication), addiction and rehab, licensing-board suspensions, fitness for duty, disability (LTD, SSDI and foreign equivalents), VA ratings, and occupational trauma. This roadmap covers what's missing and how it ties into the rest of the game.

## What's missing

| Gap | Why it matters |
|---|---|
| **Lifestyle** | Onset depends only on age, stress and fitness. Nothing you *do* (smoking, drinking, diet, exercise, weight) changes your risk, so health is something that happens to you rather than something you play. |
| **Common killers** | No COPD, stroke, dementia, kidney or liver disease, HIV or hepatitis C. Lung cancer from smoking, cirrhosis from drinking and dementia in old age are among the most common ways real lives end. |
| **Prevention** | A checkup is the only preventive act. There are no vaccinations and no age-based screening (mammograms, colonoscopies, PSA, blood pressure) that catch disease earlier. |
| **Crime and health** | The new crime system creates drug use, injecting, violence and prison, but these barely touch health. Stab and gunshot wounds, hepatitis C and HIV from needles, stimulant addiction and prison health care are missing. |
| **Old age and the end** | No long-term care (care homes, home carers), no country differences in who pays for it, no hospice, no advance directive. The last years of a life are a blank. |
| **The clinical careers** | Doctors, nurses and paramedics in the game treat abstract patients; the conditions players get and the ones clinicians treat are separate lists. |

## Phases

| Phase | Scope | Ties into |
|---|---|---|
| **H1. Lifestyle** | `health/Lifestyle.js`. State: `smoking` (never / current / former, pack-years), `drinking` (none / social / heavy), `diet` (poor / average / good), `exercise` (none / some / active), `weight` (BMI, drifting with diet and exercise). Teen peer-pressure prompt to smoke or vape. Quitting smoking (cold turkey, nicotine replacement, prescription; relapse odds). Each habit multiplies onset odds for the conditions it causes and shows on screen as a risk profile. | `HealthEngine.onsetChance`, fitness and happiness stats, Activities (gym), Money (cigarette and alcohol spending by country price level) |
| **H2. New conditions** | COPD, stroke, dementia, kidney disease, liver disease (cirrhosis), HIV, hepatitis C, stimulant addiction. Each with onset rules, progression, treatment costs and causes of death. HIV is fully treatable with antiretrovirals (near-normal lifespan) but deadly untreated; hepatitis C is curable with a 12-week course whose price varies hugely by country. | Mortality (Lifecycle), insurance billing, disability (dementia, stroke), crime (needles), prison |
| **H3. Prevention** | Yearly flu vaccine (cuts flu and pneumonia). The checkup runs age-based screenings: blood pressure and cholesterol from 30, diabetes from 40, colon cancer from 45, breast cancer (mammogram) 50–74, prostate (PSA) 55–69, cognitive screen from 70. A screening catches a condition earlier, at a lower severity. National screening programmes invite you automatically abroad (NHS bowel screening, etc.). | Checkup action, `health:checkup` bus event, HealthSystems |
| **H4. Crime and health** | `health:acute` bus event so other systems can inflict acute injuries (stab wound, gunshot wound, beating) and bill them; violence, muggings and gang life use it. Using your own product (crime/Drugs.js) can start opioid or stimulant addiction; injecting raises the odds of hepatitis C and HIV. Prison raises hepatitis C exposure and gives free (basic) care. | crime/Violence, crime/Drugs, crime/Victims, legal/Prison |
| **H5. Old age and the end** | Dementia brings the need for care: care at home (family carer from People, or paid) or a care home, with country rules for who pays (US Medicaid after spend-down, UK means test, Germany's Pflegeversicherung, Japan's long-term care insurance). A terminal diagnosis offers hospice: stop aggressive treatment, comfort and time with family. An advance directive (once) says what you want and spares your family the decision. | People (carers, elder care), Money (spend-down, estate), Retirement, Legacy |
| **H6. Clinical careers share the world** *(later)* | The doctors and nurses who treat the player can be NPCs from the hospital organisations; clinicians treat cases drawn from the same condition list; public-health careers run the screening programmes and vaccination campaigns. | Clinical careers, organisations |
| **H7. Epidemics** *(later)* | Seasonal flu severity, a pandemic event (lockdowns, vaccines, frontline workers' risk and trauma), and outbreaks in prisons and care homes. | World events, careers (frontline), economy |

## Principles

- **Every country.** New tables (long-term care, hepatitis C drug prices, screening programmes) go through the pack system with a deliberate fallback by health-system type, so every country has an answer.
- **Risk you can see.** The Health tab shows how your habits change your odds, so changing a habit feels worth it.
- **Respect.** Dementia, HIV, addiction and dying are written plainly and without judgement.

## Status

H1–H5 are implemented: `health/Lifestyle.js`, the new conditions in `health/Conditions.js`, screenings and vaccines in the checkup, the crime links, and `health/EndOfLife.js`. H6–H7 are next.
