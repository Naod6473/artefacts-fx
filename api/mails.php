<?php
// Les mails des comptes (confirmation d'inscription, mot de passe oublié) : objet, version texte et version HTML.
// HTML de mail : tableaux et styles en ligne, sans image ni police téléchargée, pour s'afficher pareil partout.
// La bannière est du texte coloré, comme un effet du site en rendu ASCII : flammes (inscription) ou givre (mot de passe).
declare(strict_types=1);

const MAIL_TEXTES = [
    'fr' => [
        'confirmer' => [
            'objet' => 'Activez votre compte Artefacts',
            'titre' => 'confirmer_compte',
            'intro' => "Bienvenue sur Artefacts. Un clic et votre compte est actif : vos favoris et vos projets vous suivront sur tous vos appareils.",
            'bouton' => 'Activer mon compte',
            'duree' => 'Lien valable 48 h, utilisable une seule fois.',
            'fin' => "Vous n'avez pas créé de compte ? Ignorez ce mail, rien ne sera activé.",
            'teinte' => 'feu',
        ],
        'oubli' => [
            'objet' => 'Nouveau mot de passe Artefacts',
            'titre' => 'nouveau_mot_de_passe',
            'intro' => "Quelqu'un (vous, sans doute) a demandé à changer le mot de passe de ce compte. Choisissez-en un nouveau avec le bouton ci-dessous.",
            'bouton' => 'Choisir un mot de passe',
            'duree' => 'Lien valable 1 h, utilisable une seule fois.',
            'fin' => "Vous n'avez rien demandé ? Ignorez ce mail : votre mot de passe ne change pas.",
            'teinte' => 'glace',
        ],
        'proposition' => [
            'objet' => 'Nouvel effet proposé : %s',
            'titre' => 'nouvelle_proposition',
            'intro' => "Un membre vient de proposer l'effet « %s ». Il attend ta relecture sur la page de modération.",
            'bouton' => 'Ouvrir la modération',
            'duree' => '',
            'fin' => 'Mail envoyé à l\'administrateur du site uniquement.',
            'teinte' => 'glace',
        ],
        'acceptee' => [
            'objet' => 'Votre effet « %s » est accepté',
            'titre' => 'effet_accepte',
            'intro' => "Bonne nouvelle : votre effet « %s » est accepté. Il entre dans la bibliothèque avec son numéro dès que la mise à jour du site est publiée.",
            'bouton' => 'Voir mes propositions',
            'duree' => '',
            'fin' => 'Merci pour votre contribution à Artefacts.',
            'teinte' => 'feu',
        ],
        'a_revoir' => [
            'objet' => 'Votre effet « %s » : quelques modifications',
            'titre' => 'modifications_demandees',
            'intro' => "Votre effet « %s » a été relu : il a besoin de quelques modifications avant d'entrer dans la bibliothèque. Ouvrez-le dans l'éditeur, corrigez, puis renvoyez-le.",
            'bouton' => 'Reprendre mon effet',
            'duree' => '',
            'fin' => 'Votre proposition reste enregistrée en attendant.',
            'teinte' => 'glace',
        ],
        'refusee' => [
            'objet' => 'Votre effet « %s » n\'a pas été retenu',
            'titre' => 'proposition_refusee',
            'intro' => "Votre effet « %s » a été relu, mais il n'a pas été retenu pour la bibliothèque. Merci d'avoir proposé, et n'hésitez pas à en envoyer d'autres.",
            'bouton' => 'Voir mes propositions',
            'duree' => '',
            'fin' => '',
            'teinte' => 'glace',
        ],
        'lien_secours' => 'Le bouton ne marche pas ? Copiez cette adresse dans votre navigateur :',
        'pied' => 'Artefacts · effets visuels de jeu en JavaScript, gratuits et sous licence MIT',
        'biblio' => 'Bibliothèque',
        'prive' => "Votre compte est privé : personne d'autre ne voit vos favoris ni vos projets.",
        'mot' => 'Le mot du relecteur :',
    ],
    'en' => [
        'confirmer' => [
            'objet' => 'Activate your Artefacts account',
            'titre' => 'confirm_account',
            'intro' => 'Welcome to Artefacts. One click and your account is active: your favorites and projects will follow you on every device.',
            'bouton' => 'Activate my account',
            'duree' => 'Link valid for 48 h, single use.',
            'fin' => "Didn't create an account? Ignore this email, nothing will be activated.",
            'teinte' => 'feu',
        ],
        'oubli' => [
            'objet' => 'New Artefacts password',
            'titre' => 'new_password',
            'intro' => 'Someone (probably you) asked to change the password of this account. Choose a new one with the button below.',
            'bouton' => 'Choose a password',
            'duree' => 'Link valid for 1 h, single use.',
            'fin' => "Didn't ask for this? Ignore this email: your password stays the same.",
            'teinte' => 'glace',
        ],
        'proposition' => [
            'objet' => 'New effect submitted: %s',
            'titre' => 'new_submission',
            'intro' => 'A member just submitted the effect “%s”. It is waiting for your review on the moderation page.',
            'bouton' => 'Open moderation',
            'duree' => '',
            'fin' => "Sent to the site's administrator only.",
            'teinte' => 'glace',
        ],
        'acceptee' => [
            'objet' => 'Your effect “%s” is accepted',
            'titre' => 'effect_accepted',
            'intro' => 'Good news: your effect “%s” is accepted. It joins the library with its own number as soon as the site update is published.',
            'bouton' => 'See my submissions',
            'duree' => '',
            'fin' => 'Thank you for contributing to Artefacts.',
            'teinte' => 'feu',
        ],
        'a_revoir' => [
            'objet' => 'Your effect “%s”: a few changes',
            'titre' => 'changes_requested',
            'intro' => 'Your effect “%s” has been reviewed: it needs a few changes before joining the library. Open it in the editor, fix it, then send it again.',
            'bouton' => 'Back to my effect',
            'duree' => '',
            'fin' => 'Your submission stays saved in the meantime.',
            'teinte' => 'glace',
        ],
        'refusee' => [
            'objet' => 'Your effect “%s” was not selected',
            'titre' => 'submission_declined',
            'intro' => "Your effect “%s” has been reviewed, but it wasn't selected for the library. Thanks for submitting, and feel free to send others.",
            'bouton' => 'See my submissions',
            'duree' => '',
            'fin' => '',
            'teinte' => 'glace',
        ],
        'lien_secours' => 'Button not working? Paste this address into your browser:',
        'pied' => 'Artefacts · free JavaScript game visual effects, MIT licensed',
        'biblio' => 'Library',
        'prive' => 'Your account is private: nobody else sees your favorites or projects.',
        'mot' => "The reviewer's note:",
    ],
];

/**
 * [objet, texte, html] du mail $modele dans la langue $langue (fr | en) : confirmer, oubli (comptes) ; proposition,
 * acceptee, a_revoir, refusee (effets proposés : $nom remplace %s, $mot est le message du relecteur, en citation).
 */
function contenuMail(string $langue, string $modele, string $lien, string $site, string $nom = '', string $mot = ''): array
{
    $t = MAIL_TEXTES[$langue] ?? MAIL_TEXTES['en'];
    $m = $t[$modele];
    foreach (['objet', 'intro'] as $k) $m[$k] = str_replace('%s', $nom, $m[$k]);
    $citation = $mot !== '' ? "\n\n{$t['mot']}\n« $mot »" : '';
    $texte = "> {$m['titre']}\n\n{$m['intro']}$citation\n\n{$m['bouton']} :\n$lien\n\n{$m['duree']}\n\n{$m['fin']}\n\n-- \n{$t['prive']}\n{$t['pied']}\n$site";
    $h = fn (string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $motHtml = $mot !== '' ? '<p style="margin:16px 0 0;font-size:12px;color:#8796ad;">' . $h($t['mot']) . '</p><p style="margin:6px 0 0;padding:10px 14px;border-left:2px solid #ffb347;background:#05070c;font-size:14px;line-height:22px;color:#d6e2f0;white-space:pre-wrap;">' . $h($mot) . '</p>' : '';
    $duree = $m['duree'] !== '' ? '<p style="margin:12px 0 0;font-size:12px;color:#ffb347;">' . $h($m['duree']) . '</p>' : '';
    $fin = $m['fin'] !== '' ? '<p style="margin:18px 0 0;padding-top:16px;border-top:1px dashed #2a3547;font-size:12px;line-height:18px;color:#8796ad;">' . $h($m['fin']) . '</p>' : '';
    $l = $h($lien);
    $mono = "'JetBrains Mono',Consolas,Menlo,'Courier New',monospace";
    $banniere = banniereMail($m['teinte']);
    $html = <<<HTML
<!doctype html><html lang="$langue"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>{$h($m['objet'])}</title></head>
<body style="margin:0;padding:0;background:#07090f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07090f;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:$mono;color:#d6e2f0;">
  <tr><td style="padding:0 4px 16px;font-size:18px;font-weight:700;letter-spacing:2px;color:#d6e2f0;">ARTEFACTS<span style="color:#5ce1e6;">_</span></td></tr>
  <tr><td style="background:#090c14;border:1px solid #1c2433;">
    <div style="padding:18px 20px 14px;font-size:11px;line-height:12px;letter-spacing:1px;white-space:nowrap;overflow:hidden;background:#05070c;border-bottom:1px solid #1c2433;">$banniere</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:26px 24px 8px;">
      <div style="font-size:16px;font-weight:700;color:#d6e2f0;"><span style="color:#5ce1e6;">&gt;</span> {$h($m['titre'])}</div>
      <p style="margin:14px 0 0;font-size:14px;line-height:22px;color:#c3cfdd;">{$h($m['intro'])}</p>
      $motHtml
    </td></tr>
    <tr><td style="padding:22px 24px 6px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#5ce1e6;">
        <a href="$l" style="display:inline-block;padding:14px 24px;font-family:$mono;font-size:14px;font-weight:700;color:#07090f;text-decoration:none;">{$h($m['bouton'])} &rarr;</a>
      </td></tr></table>
      $duree
    </td></tr>
    <tr><td style="padding:18px 24px 24px;">
      <p style="margin:0;font-size:12px;line-height:18px;color:#8796ad;">{$h($t['lien_secours'])}</p>
      <p style="margin:6px 0 0;font-size:12px;line-height:18px;word-break:break-all;"><a href="$l" style="color:#5ce1e6;text-decoration:none;">$l</a></p>
      $fin
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:18px 4px 0;font-size:11px;line-height:18px;color:#6b7a90;">
    {$h($t['prive'])}<br>{$h($t['pied'])}<br>
    <a href="$site/" style="color:#8796ad;">naod.fr</a> · <a href="$site/$langue/bibliotheque/" style="color:#8796ad;">{$h($t['biblio'])}</a> · <a href="https://github.com/Naod6473/artefacts-fx" style="color:#8796ad;">★ GitHub</a>
  </td></tr>
</table></td></tr></table></body></html>
HTML;
    return [$m['objet'], $texte, $html];
}

/** 5 lignes de 62 caractères de la rampe « .:-=+*#%@ », colorées du sombre au clair. Toujours la même pour une teinte. */
function banniereMail(string $teinte): string
{
    $rampe = ' .:-=+*#%@';
    $couleurs = [
        'feu' => ['#3a1d0a', '#7a3410', '#c2561a', '#ff8a3d', '#ffb347', '#ffe2a8'],
        'glace' => ['#0c2230', '#144a5c', '#1f7f8f', '#38b6c4', '#5ce1e6', '#d4fbff'],
    ][$teinte];
    $graine = $teinte === 'feu' ? 7 : 19;
    $hasard = function () use (&$graine): float {
        $graine = ($graine * 9301 + 49297) % 233280;
        return $graine / 233280;
    };
    $lignes = [];
    for ($y = 0; $y < 5; $y++) {
        $ligne = '';
        for ($x = 0; $x < 62; $x++) {
            $onde = $teinte === 'feu'
                ? sin($x * 0.35) * 0.5 + sin($x * 0.13 + 1.2) * 0.6 + 1.6 - (4 - $y) * 0.55
                : cos($x * 0.22) * 0.4 + sin($x * 0.51) * 0.35 + 1.2 - abs($y - 2) * 0.55;
            $v = max(0, min(0.999, $onde / 2.4 + ($hasard() - 0.5) * 0.35));
            $c = $rampe[(int) floor($v * 10)];
            $ligne .= $c === ' ' ? '&nbsp;' : '<span style="color:' . $couleurs[min(5, (int) floor($v * 6))] . '">' . $c . '</span>';
        }
        $lignes[] = $ligne;
    }
    return implode('<br>', $lignes);
}
