	<footer class="footer section__main">
		<section class="footer__quote article__main">
			<p>Studio Isphording entwickelt Design für Print und Digitale Medien und setzt dabei auf Technologien der 3D Visualisierung, Virtual Reality und Generativer AI.</p>
		</section>
		<section class="menu">
			<ul>
				<li><!-- EMPTY	 --></li>
			</ul>
			<ul>
				<p class="copyright"><?= $site->copyright()->html() ?></p>
				<li><a href="<?= $pages->find('imprint')->url() ?>">Imprint</a></li>
				<li><a href="<?= $pages->find('disclaimer')->url() ?>">Disclaimer</a></li>
				<li><a href="<?= $pages->find('privacy')->url() ?>">Data & Privacy Policy</a></li>
				<li><a href="<?= $pages->find('gdpr')->url() ?>">GDPR</a></li>
			</ul>
		</section>
	</footer>

	<?= js([
		'assets/bundle/app.bundle.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
		'https://cdn.jsdelivr.net/npm/@barba/core',
		'@auto'
	], true) ?>

	</div><!-- data-barba="container" -->
</body>

</html>