	<footer class="footer">
		<section class="large__quote article__main">
			<?= $site->footer()->kirbytext() ?>
		</section>

		<section class="footer__bottom">
			<!-- MENU -->
			<section class="menu">
				<ul>
					<li><a href="<?= $pages->find('imprint')->url() ?>">Imprint</a></li>
					<li><a href="<?= $pages->find('disclaimer')->url() ?>">Disclaimer</a></li>
					<li><a href="<?= $pages->find('privacy')->url() ?>">Data & Privacy Policy</a></li>
					<li><a href="<?= $pages->find('gdpr')->url() ?>">GDPR</a></li>
				</ul>
				<ul>
					<li><p class="copyright"><?= $site->copyright()->html() ?></p></li>
				</ul>
			</section>

			<!-- BRANDING -->
			<section class="footer__branding">
				<span>Isphording</span>
			</section>
		</section>
	</footer>

	<?= js([
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
		'https://cdn.jsdelivr.net/npm/@barba/core',
		'@auto'
	], true) ?>
	
	<script type="module" src="<?= url('assets/bundle/app.bundle.js') ?>"></script>

	</div><!-- data-barba="container" -->
</body>

</html>
