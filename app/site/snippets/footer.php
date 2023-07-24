	<footer class="footer section__main">
		<ul>
			<li><!-- EMPTY	 --></li>
		</ul>
		<ul>
			<li>Copyright 2022 by Johannes Isphording.</li>
			<li><a href="<?= $pages->find('imprint')->url() ?>">Imprint</a></li>
			<li><a href="<?= $pages->find('disclaimer')->url() ?>">Disclaimer</a></li>
			<li><a href="<?= $pages->find('privacy')->url() ?>">Data & Privacy Policy</a></li>
		</ul>
	</footer>

	<?= js([
		'assets/bundle/app.bundle.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js',
		'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
		'https://cdn.jsdelivr.net/npm/@barba/core',
		'@auto'
	]) ?>

	</div><!-- data-barba="container" -->
</body>

</html>