// @ts-nocheck
// Email notification system
// This implementation uses Nodemailer for sending emails
// Requires SMTP configuration (e.g., SendGrid, Resend, or custom SMTP)
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Priority } from "@/types";
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Validate SMTP configuration to prevent injection attacks
 * @internal Used to validate SMTP config before creating transporter
 */
export function validateSmtpConfig(config: EmailConfig): void {
  if (stryMutAct_9fa48("3567")) {
    {}
  } else {
    stryCov_9fa48("3567");
    // Validate host - only allow alphanumeric, dots, and hyphens
    if (stryMutAct_9fa48("3570") ? false : stryMutAct_9fa48("3569") ? true : stryMutAct_9fa48("3568") ? /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(config.host) : (stryCov_9fa48("3568", "3569", "3570"), !(stryMutAct_9fa48("3577") ? /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[^a-zA-Z0-9])?$/ : stryMutAct_9fa48("3576") ? /^[a-zA-Z0-9]([^a-zA-Z0-9.-]*[a-zA-Z0-9])?$/ : stryMutAct_9fa48("3575") ? /^[a-zA-Z0-9]([a-zA-Z0-9.-][a-zA-Z0-9])?$/ : stryMutAct_9fa48("3574") ? /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])$/ : stryMutAct_9fa48("3573") ? /^[^a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/ : stryMutAct_9fa48("3572") ? /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?/ : stryMutAct_9fa48("3571") ? /[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/ : (stryCov_9fa48("3571", "3572", "3573", "3574", "3575", "3576", "3577"), /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/)).test(config.host))) {
      if (stryMutAct_9fa48("3578")) {
        {}
      } else {
        stryCov_9fa48("3578");
        throw new Error(stryMutAct_9fa48("3579") ? `` : (stryCov_9fa48("3579"), `Invalid SMTP host: ${config.host}`));
      }
    }

    // Validate port - must be valid TCP port
    if (stryMutAct_9fa48("3582") ? (!Number.isInteger(config.port) || config.port < 1) && config.port > 65535 : stryMutAct_9fa48("3581") ? false : stryMutAct_9fa48("3580") ? true : (stryCov_9fa48("3580", "3581", "3582"), (stryMutAct_9fa48("3584") ? !Number.isInteger(config.port) && config.port < 1 : stryMutAct_9fa48("3583") ? false : (stryCov_9fa48("3583", "3584"), (stryMutAct_9fa48("3585") ? Number.isInteger(config.port) : (stryCov_9fa48("3585"), !Number.isInteger(config.port))) || (stryMutAct_9fa48("3588") ? config.port >= 1 : stryMutAct_9fa48("3587") ? config.port <= 1 : stryMutAct_9fa48("3586") ? false : (stryCov_9fa48("3586", "3587", "3588"), config.port < 1)))) || (stryMutAct_9fa48("3591") ? config.port <= 65535 : stryMutAct_9fa48("3590") ? config.port >= 65535 : stryMutAct_9fa48("3589") ? false : (stryCov_9fa48("3589", "3590", "3591"), config.port > 65535)))) {
      if (stryMutAct_9fa48("3592")) {
        {}
      } else {
        stryCov_9fa48("3592");
        throw new Error(stryMutAct_9fa48("3593") ? `` : (stryCov_9fa48("3593"), `Invalid SMTP port: ${config.port}`));
      }
    }

    // Validate port is not 25 to avoid potential issues with non-encrypted SMTP
    if (stryMutAct_9fa48("3596") ? config.port === 25 || !config.secure : stryMutAct_9fa48("3595") ? false : stryMutAct_9fa48("3594") ? true : (stryCov_9fa48("3594", "3595", "3596"), (stryMutAct_9fa48("3598") ? config.port !== 25 : stryMutAct_9fa48("3597") ? true : (stryCov_9fa48("3597", "3598"), config.port === 25)) && (stryMutAct_9fa48("3599") ? config.secure : (stryCov_9fa48("3599"), !config.secure)))) {
      if (stryMutAct_9fa48("3600")) {
        {}
      } else {
        stryCov_9fa48("3600");
        console.warn(stryMutAct_9fa48("3601") ? "" : (stryCov_9fa48("3601"), "Warning: Using non-encrypted SMTP on port 25"));
      }
    }
  }
}

/**
 * Sanitize email address to prevent header injection
 * @internal Used to sanitize email addresses before sending
 */
export function sanitizeEmail(email: string): string {
  if (stryMutAct_9fa48("3602")) {
    {}
  } else {
    stryCov_9fa48("3602");
    // Remove line breaks and other injection characters
    return email.replace(stryMutAct_9fa48("3603") ? /[^\r\n<>,;:\\]/g : (stryCov_9fa48("3603"), /[\r\n<>,;:\\]/g), stryMutAct_9fa48("3604") ? "Stryker was here!" : (stryCov_9fa48("3604"), ""));
  }
}

/**
 * Get user notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number;
  dueDateReminders: boolean;
  overdueReminders: boolean;
  dailySummary: boolean;
}

// Create transporter with config
function createTransporter(config?: EmailConfig) {
  if (stryMutAct_9fa48("3605")) {
    {}
  } else {
    stryCov_9fa48("3605");
    // Check if nodemailer is available
    try {
      if (stryMutAct_9fa48("3606")) {
        {}
      } else {
        stryCov_9fa48("3606");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require("nodemailer");
        const smtp = stryMutAct_9fa48("3609") ? config && {
          host: process.env.SMTP_HOST || "smtp.resend.dev",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: {
            user: process.env.SMTP_USER || "resend",
            pass: process.env.SMTP_PASS || ""
          }
        } : stryMutAct_9fa48("3608") ? false : stryMutAct_9fa48("3607") ? true : (stryCov_9fa48("3607", "3608", "3609"), config || (stryMutAct_9fa48("3610") ? {} : (stryCov_9fa48("3610"), {
          host: stryMutAct_9fa48("3613") ? process.env.SMTP_HOST && "smtp.resend.dev" : stryMutAct_9fa48("3612") ? false : stryMutAct_9fa48("3611") ? true : (stryCov_9fa48("3611", "3612", "3613"), process.env.SMTP_HOST || (stryMutAct_9fa48("3614") ? "" : (stryCov_9fa48("3614"), "smtp.resend.dev"))),
          port: parseInt(stryMutAct_9fa48("3617") ? process.env.SMTP_PORT && "587" : stryMutAct_9fa48("3616") ? false : stryMutAct_9fa48("3615") ? true : (stryCov_9fa48("3615", "3616", "3617"), process.env.SMTP_PORT || (stryMutAct_9fa48("3618") ? "" : (stryCov_9fa48("3618"), "587")))),
          secure: stryMutAct_9fa48("3619") ? true : (stryCov_9fa48("3619"), false),
          auth: stryMutAct_9fa48("3620") ? {} : (stryCov_9fa48("3620"), {
            user: stryMutAct_9fa48("3623") ? process.env.SMTP_USER && "resend" : stryMutAct_9fa48("3622") ? false : stryMutAct_9fa48("3621") ? true : (stryCov_9fa48("3621", "3622", "3623"), process.env.SMTP_USER || (stryMutAct_9fa48("3624") ? "" : (stryCov_9fa48("3624"), "resend"))),
            pass: stryMutAct_9fa48("3627") ? process.env.SMTP_PASS && "" : stryMutAct_9fa48("3626") ? false : stryMutAct_9fa48("3625") ? true : (stryCov_9fa48("3625", "3626", "3627"), process.env.SMTP_PASS || (stryMutAct_9fa48("3628") ? "Stryker was here!" : (stryCov_9fa48("3628"), "")))
          })
        })));

        // Validate configuration to prevent injection attacks
        if (stryMutAct_9fa48("3631") ? config && process.env.SMTP_HOST : stryMutAct_9fa48("3630") ? false : stryMutAct_9fa48("3629") ? true : (stryCov_9fa48("3629", "3630", "3631"), config || process.env.SMTP_HOST)) {
          if (stryMutAct_9fa48("3632")) {
            {}
          } else {
            stryCov_9fa48("3632");
            validateSmtpConfig(smtp);
          }
        }
        return nodemailer.createTransporter(smtp);
      }
    } catch {
      if (stryMutAct_9fa48("3633")) {
        {}
      } else {
        stryCov_9fa48("3633");
        // Fallback stub for development
        return stryMutAct_9fa48("3634") ? {} : (stryCov_9fa48("3634"), {
          sendMail: stryMutAct_9fa48("3635") ? () => undefined : (stryCov_9fa48("3635"), async () => stryMutAct_9fa48("3636") ? {} : (stryCov_9fa48("3636"), {
            success: stryMutAct_9fa48("3637") ? false : (stryCov_9fa48("3637"), true)
          }))
        });
      }
    }
  }
}
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
export async function sendEmail(options: EmailOptions, config?: EmailConfig): Promise<boolean> {
  if (stryMutAct_9fa48("3638")) {
    {}
  } else {
    stryCov_9fa48("3638");
    try {
      if (stryMutAct_9fa48("3639")) {
        {}
      } else {
        stryCov_9fa48("3639");
        const transporter = createTransporter(config);
        await transporter.sendMail(stryMutAct_9fa48("3640") ? {} : (stryCov_9fa48("3640"), {
          from: stryMutAct_9fa48("3643") ? process.env.EMAIL_FROM && "TaskFlow <noreply@taskflow.app>" : stryMutAct_9fa48("3642") ? false : stryMutAct_9fa48("3641") ? true : (stryCov_9fa48("3641", "3642", "3643"), process.env.EMAIL_FROM || (stryMutAct_9fa48("3644") ? "" : (stryCov_9fa48("3644"), "TaskFlow <noreply@taskflow.app>"))),
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        }));
        return stryMutAct_9fa48("3645") ? false : (stryCov_9fa48("3645"), true);
      }
    } catch (error) {
      if (stryMutAct_9fa48("3646")) {
        {}
      } else {
        stryCov_9fa48("3646");
        console.error(stryMutAct_9fa48("3647") ? "" : (stryCov_9fa48("3647"), "Failed to send email:"), error);
        return stryMutAct_9fa48("3648") ? true : (stryCov_9fa48("3648"), false);
      }
    }
  }
}
export interface EmailTask {
  id: number;
  name: string;
  description: string | null;
  deadline: string | null;
  priority?: Priority;
}

/**
 * Get notification settings for a user
 */
export async function getUserNotificationSettings(): Promise<NotificationSettings> {
  if (stryMutAct_9fa48("3649")) {
    {}
  } else {
    stryCov_9fa48("3649");
    // In a real implementation, this would fetch from the database
    // For now, return default settings
    return stryMutAct_9fa48("3650") ? {} : (stryCov_9fa48("3650"), {
      enabled: stryMutAct_9fa48("3651") ? false : (stryCov_9fa48("3651"), true),
      reminderMinutes: 60,
      dueDateReminders: stryMutAct_9fa48("3652") ? false : (stryCov_9fa48("3652"), true),
      overdueReminders: stryMutAct_9fa48("3653") ? false : (stryCov_9fa48("3653"), true),
      dailySummary: stryMutAct_9fa48("3654") ? true : (stryCov_9fa48("3654"), false)
    });
  }
}

/**
 * Check if we should send an email notification for a task
 * Returns true if notifications are enabled and the task qualifies
 */
export async function shouldSendNotification(userId: number, task: EmailTask, type: "reminder" | "due_soon" | "overdue"): Promise<boolean> {
  if (stryMutAct_9fa48("3655")) {
    {}
  } else {
    stryCov_9fa48("3655");
    void userId;
    const settings = await getUserNotificationSettings();
    if (stryMutAct_9fa48("3658") ? false : stryMutAct_9fa48("3657") ? true : stryMutAct_9fa48("3656") ? settings.enabled : (stryCov_9fa48("3656", "3657", "3658"), !settings.enabled)) return stryMutAct_9fa48("3659") ? true : (stryCov_9fa48("3659"), false);
    switch (type) {
      case stryMutAct_9fa48("3661") ? "" : (stryCov_9fa48("3661"), "reminder"):
        if (stryMutAct_9fa48("3660")) {} else {
          stryCov_9fa48("3660");
          return stryMutAct_9fa48("3665") ? settings.reminderMinutes <= 0 : stryMutAct_9fa48("3664") ? settings.reminderMinutes >= 0 : stryMutAct_9fa48("3663") ? false : stryMutAct_9fa48("3662") ? true : (stryCov_9fa48("3662", "3663", "3664", "3665"), settings.reminderMinutes > 0);
        }
      case stryMutAct_9fa48("3667") ? "" : (stryCov_9fa48("3667"), "due_soon"):
        if (stryMutAct_9fa48("3666")) {} else {
          stryCov_9fa48("3666");
          return settings.dueDateReminders;
        }
      case stryMutAct_9fa48("3669") ? "" : (stryCov_9fa48("3669"), "overdue"):
        if (stryMutAct_9fa48("3668")) {} else {
          stryCov_9fa48("3668");
          return settings.overdueReminders;
        }
      default:
        if (stryMutAct_9fa48("3670")) {} else {
          stryCov_9fa48("3670");
          return stryMutAct_9fa48("3671") ? true : (stryCov_9fa48("3671"), false);
        }
    }
  }
}
export async function sendTaskReminderEmail(userEmail: string, task: EmailTask): Promise<boolean> {
  if (stryMutAct_9fa48("3672")) {
    {}
  } else {
    stryCov_9fa48("3672");
    const subject = stryMutAct_9fa48("3673") ? `` : (stryCov_9fa48("3673"), `Task Reminder: ${task.name}`);
    const html = stryMutAct_9fa48("3674") ? `` : (stryCov_9fa48("3674"), `
    <h2>Task Reminder</h2>
    <p>You have a pending task:</p>
    <h3>${task.name}</h3>
    ${task.description ? stryMutAct_9fa48("3675") ? `` : (stryCov_9fa48("3675"), `<p>${task.description}</p>`) : stryMutAct_9fa48("3676") ? "Stryker was here!" : (stryCov_9fa48("3676"), "")}
    ${task.deadline ? stryMutAct_9fa48("3677") ? `` : (stryCov_9fa48("3677"), `<p><strong>Due:</strong> ${new Date(task.deadline).toLocaleString()}</p>`) : stryMutAct_9fa48("3678") ? "Stryker was here!" : (stryCov_9fa48("3678"), "")}
    <p><a href="${process.env.NEXTAUTH_URL}/tasks/${task.id}">View Task</a></p>
  `);
    return sendEmail(stryMutAct_9fa48("3679") ? {} : (stryCov_9fa48("3679"), {
      to: userEmail,
      subject,
      html
    }));
  }
}
export async function sendDueSoonEmail(userEmail: string, task: EmailTask): Promise<boolean> {
  if (stryMutAct_9fa48("3680")) {
    {}
  } else {
    stryCov_9fa48("3680");
    const subject = stryMutAct_9fa48("3681") ? `` : (stryCov_9fa48("3681"), `Due Soon: ${task.name}`);
    const html = stryMutAct_9fa48("3682") ? `` : (stryCov_9fa48("3682"), `
    <h2>Task Due Soon</h2>
    <p>The following task is due soon:</p>
    <h3>${task.name}</h3>
    ${task.deadline ? stryMutAct_9fa48("3683") ? `` : (stryCov_9fa48("3683"), `<p><strong>Due:</strong> ${new Date(task.deadline).toLocaleString()}</p>`) : stryMutAct_9fa48("3684") ? "Stryker was here!" : (stryCov_9fa48("3684"), "")}
    <p><a href="${process.env.NEXTAUTH_URL}/tasks/${task.id}">View Task</a></p>
  `);
    return sendEmail(stryMutAct_9fa48("3685") ? {} : (stryCov_9fa48("3685"), {
      to: userEmail,
      subject,
      html
    }));
  }
}
export async function sendTaskSharedEmail(userEmail: string, taskName: string, sharerName: string, permission: "view" | "edit"): Promise<boolean> {
  if (stryMutAct_9fa48("3686")) {
    {}
  } else {
    stryCov_9fa48("3686");
    const subject = stryMutAct_9fa48("3687") ? `` : (stryCov_9fa48("3687"), `${sharerName} shared a task with you`);
    const html = stryMutAct_9fa48("3688") ? `` : (stryCov_9fa48("3688"), `
    <h2>Task Shared With You</h2>
    <p>${sharerName} has shared a task with you.</p>
    <h3>${taskName}</h3>
    <p><strong>Your permission:</strong> ${permission}</p>
    <p><a href="${process.env.NEXTAUTH_URL}/tasks">View Tasks</a></p>
  `);
    return sendEmail(stryMutAct_9fa48("3689") ? {} : (stryCov_9fa48("3689"), {
      to: userEmail,
      subject,
      html
    }));
  }
}
export async function sendWeeklyDigest(userEmail: string, summary: {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  criticalTasks: number;
}): Promise<boolean> {
  if (stryMutAct_9fa48("3690")) {
    {}
  } else {
    stryCov_9fa48("3690");
    const subject = stryMutAct_9fa48("3691") ? `` : (stryCov_9fa48("3691"), `Your Weekly Task Summary`);
    const html = stryMutAct_9fa48("3692") ? `` : (stryCov_9fa48("3692"), `
    <h2>Weekly Task Summary</h2>
    <div style="display: grid; gap: 8px;">
      <div><strong>Total Tasks:</strong> ${summary.totalTasks}</div>
      <div><strong>Completed:</strong> ${summary.completedTasks}</div>
      <div><strong>Overdue:</strong> ${summary.overdueTasks}</div>
      <div><strong>Critical:</strong> ${summary.criticalTasks}</div>
    </div>
    <p style="margin-top: 16px;"><a href="${process.env.NEXTAUTH_URL}">View Dashboard</a></p>
  `);
    return sendEmail(stryMutAct_9fa48("3693") ? {} : (stryCov_9fa48("3693"), {
      to: userEmail,
      subject,
      html
    }));
  }
}