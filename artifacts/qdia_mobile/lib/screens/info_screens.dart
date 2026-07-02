import 'package:flutter/material.dart';
import 'package:qdia_mobile/l10n/app_strings.dart';
import 'package:qdia_mobile/theme/qdia_theme.dart';
import 'package:qdia_mobile/widgets/info_page_scaffold.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InfoPageScaffold(
      title: 'QDIA Export DZ 🇩🇿',
      subtitle: context.tr('footer.marketplace_tag'),
      icon: Icons.storefront_rounded,
      children: [
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.asset('assets/images/logo.png', height: 88, fit: BoxFit.contain),
          ),
        ),
        const SizedBox(height: 16),
        InfoSectionCard(
          icon: Icons.public_rounded,
          title: context.tr('footer.brand_title'),
          body: context.tr('footer.description'),
        ),
        InfoSectionCard(
          icon: Icons.verified_rounded,
          title: 'Marketplace B2B',
          body: 'Produits certifiés · Pricing Incoterms · Agent IA export · Ports & douane · Trade Assurance · Messagerie B2B.',
        ),
        InfoSectionCard(
          icon: Icons.flag_rounded,
          title: context.tr('footer.copyright'),
          body: 'Plateforme dédiée à l\'export algérien. Version 0.1.0 (beta).\n\n${context.tr('footer.copyright_full')}',
        ),
      ],
    );
  }
}

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InfoPageScaffold(
      title: context.tr('legal_page.cgu_title'),
      subtitle: context.tr('footer.terms'),
      icon: Icons.description_outlined,
      accent: QdiaColors.navy,
      children: [
        InfoSectionCard(title: context.tr('legal_page.cgu_title'), body: context.tr('legal_page.cgu_body')),
        InfoSectionCard(
          icon: Icons.gavel_rounded,
          title: 'Responsabilités',
          body: 'Les exportateurs garantissent la conformité halal, phytosanitaire et origine. Les transactions sont conclues entre acheteurs et fournisseurs. QDIA facilite la mise en relation.',
        ),
        InfoSectionCard(
          icon: Icons.payments_outlined,
          title: 'Paiements',
          body: 'Escrow, SWIFT et lettre de crédit selon les options disponibles. Commission plateforme 3 % sur les transactions validées.',
        ),
      ],
    );
  }
}

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return InfoPageScaffold(
      title: context.tr('legal_page.privacy_title'),
      subtitle: context.tr('footer.privacy'),
      icon: Icons.privacy_tip_outlined,
      accent: const Color(0xFF034E85),
      children: [
        InfoSectionCard(title: context.tr('legal_page.privacy_title'), body: context.tr('legal_page.privacy_body')),
        InfoSectionCard(title: context.tr('legal_page.cookies_title'), body: context.tr('legal_page.cookies_body')),
      ],
    );
  }
}

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final faqs = [
      ('Comment publier un produit ?', 'Utilisez l\'Agent IA Export ou l\'espace fournisseur depuis un compte connecté.'),
      ('Comment demander un devis (RFQ) ?', 'Ajoutez des produits au panier devis depuis le catalogue, puis envoyez votre demande.'),
      ('Comment suivre un colis ?', 'Allez dans Paramètres → Suivi colis et entrez votre numéro DHL, FedEx ou Maersk.'),
      ('Comment contacter un exportateur ?', 'Ouvrez une fiche produit et utilisez la messagerie B2B.'),
    ];

    return InfoPageScaffold(
      title: 'Centre d\'aide',
      subtitle: 'FAQ · Support · Guides export',
      icon: Icons.help_outline_rounded,
      accent: QdiaColors.success,
      children: [
        ...faqs.map((f) => InfoSectionCard(icon: Icons.quiz_outlined, title: f.$1, body: f.$2)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [QdiaColors.sidebar, QdiaColors.primary]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(context.tr('footer.contact'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
              const SizedBox(height: 8),
              Text('support@qdiadz.com', style: const TextStyle(color: QdiaColors.gold, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('+213 555 12 34 56', style: const TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () => launchUrl(Uri.parse('mailto:support@qdiadz.com')),
                icon: const Icon(Icons.email_outlined, color: Colors.white, size: 18),
                label: Text(context.tr('common.send'), style: const TextStyle(color: Colors.white)),
                style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white38)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
